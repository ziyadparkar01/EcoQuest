import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

import {
  NATURE_ITEM_SPECS,
  detectManufacturedObject,
  matchClaimedNatureItem,
  getShapeInfoForScavengerItem,
} from '../../src/data/natureItemShapes.ts';

export interface VoiceAssistantGameState {
  playerName?: string;
  currentQuest?: string;
  questPhase?: string;
  scavengerItems?: string[];
  foundItems?: string[];
  playerInventory?: string[];
  playerScore?: number;
  location?: any;
  activeWaypoint?: any;
  currentTime?: string;
  currentDay?: string;
  mission?: any;
}

export interface VoiceInteractionResult {
  transcript?: string;
  spokenText: string;
  thought: string;
  action: string;
  itemFound?: string | null;
  allItemsFound?: boolean;
  pointsAwarded?: number;
  audioBase64?: string;
  mimeType?: string;
  questUpdate?: any;
  source: string;
}

class VoiceAssistantEngine {
  private cache: Map<string, { buffer: Buffer; mimeType: string; base64: string }> = new Map();
  private modelCooldownUntil: Map<string, number> = new Map();
  private elevenLabsDisabled = false;

  constructor() {
    console.log('[VoiceAssistantEngine] Dedicated Voice Assistant Backend Engine initialized');
  }

  /**
   * Parse retry delay from Gemini API 429 / RESOURCE_EXHAUSTED errors
   */
  private parseRetryDelayMs(err: any): number {
    try {
      const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
      const delayMatch = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/);
      if (delayMatch && delayMatch[1]) {
        return parseInt(delayMatch[1], 10) * 1000;
      }
      const hoursMatch = msg.match(/(\d+)h/);
      const minsMatch = msg.match(/(\d+)m/);
      const secsMatch = msg.match(/(\d+(?:\.\d+)?)s/);
      let totalMs = 0;
      if (hoursMatch) totalMs += parseInt(hoursMatch[1], 10) * 3600 * 1000;
      if (minsMatch) totalMs += parseInt(minsMatch[1], 10) * 60 * 1000;
      if (secsMatch) totalMs += Math.round(parseFloat(secsMatch[1]) * 1000);
      if (totalMs > 0) return totalMs;
    } catch (_) {}
    return 30 * 60 * 1000; // 30 minutes default
  }

  /**
   * Transcribe recorded audio (base64) using Gemini models with quota awareness
   */
  public async transcribeAudio(audioBase64: string, mimeType: string = 'audio/webm'): Promise<string> {
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return '';
    }

    const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const cleanMime = (mimeType || 'audio/webm').split(';')[0].trim();
    const candidateModels = ['gemini-3.5-transcribe', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];

    for (const model of candidateModels) {
      if ((this.modelCooldownUntil.get(model) || 0) > Date.now()) {
        continue;
      }

      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMime || 'audio/webm',
                    data: cleanBase64,
                  },
                },
                {
                  text: 'Transcribe the spoken English in this audio recording verbatim. Output ONLY the words spoken. If the audio is completely silent, background noise only, or contains no speech, respond with EMPTY.',
                },
              ],
            },
          ],
        });

        const raw = (response.text || '').trim();
        const upper = raw.toUpperCase();
        if (
          !raw ||
          upper === 'EMPTY' ||
          upper === '[SILENCE]' ||
          upper === '[NO_SPEECH]' ||
          raw.includes('00:00:00') ||
          raw.toLowerCase().includes('no speech') ||
          raw.toLowerCase().includes('indistinct')
        ) {
          continue;
        }

        const transcript = raw.replace(/^["']|["']$/g, '').trim();
        if (transcript.length >= 2) {
          console.log(`[VoiceAssistantEngine] Transcribed via ${model}: "${transcript}"`);
          return transcript;
        }
      } catch (err: any) {
        const errMsg = err?.message || '';
        if (
          err?.status === 429 ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Quota exceeded') ||
          errMsg.includes('quota')
        ) {
          const delayMs = this.parseRetryDelayMs(err);
          this.modelCooldownUntil.set(model, Date.now() + delayMs);
          console.info(`[VoiceAssistantEngine] Transcribe model ${model} quota active cooldown for ${Math.round(delayMs / 60000)}m.`);
        } else {
          console.warn(`[VoiceAssistantEngine] Transcribe notice for ${model}:`, errMsg);
        }
      }
    }

    return '';
  }

  /**
   * Synthesize spoken text into crystal-clear WAV audio using Gemini Flash Lite TTS
  /**
   * Humanize text for spoken audio: replaces rigid symbols, abbreviations, and list syntax
   * with smooth, melodious conversational English that sounds warm and natural in earphones.
   */
  public humanizeTextForSpeech(text: string): string {
    if (!text) return '';
    return text
      .replace(/2x\s*/gi, 'two ')
      .replace(/1x\s*/gi, 'one ')
      .replace(/3x\s*/gi, 'three ')
      .replace(/4x\s*/gi, 'four ')
      .replace(/\(Wings\)/gi, 'for the wings')
      .replace(/\(Spine\)/gi, 'for the spine')
      .replace(/\(Eyes\)/gi, 'for the eyes')
      .replace(/[*_#`~[\]]/g, '')
      .replace(/\(\s*([^\)]+)\s*\)/g, ', $1, ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Synthesize spoken text into a warm, natural, human-like voice.
   * Uses ElevenLabs (if configured) or Gemini Flash Lite TTS with warm conversational speech styling.
   */
  public async synthesizeSpeech(
    text: string,
    voiceName: string = 'Zephyr'
  ): Promise<{ buffer: Buffer; mimeType: string; base64: string } | null> {
    if (!text || !text.trim()) return null;

    const cleanText = this.humanizeTextForSpeech(text).slice(0, 1000);
    const validVoices = ['Zephyr', 'Kore', 'Aoede', 'Puck', 'Fenrir', 'Charon'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Zephyr';

    const cacheKey = `${chosenVoice}:${cleanText}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 1. If ElevenLabs API key is configured, synthesize with ultra-lifelike human voice
    const rawElevenKey = process.env.ELEVENLABS_API_KEY;
    const elevenKey = (rawElevenKey || 'sk_c7e4055e524972719127dde61105da5411bf1570e693e5d2').trim();
    if (
      !this.elevenLabsDisabled &&
      elevenKey &&
      elevenKey.length >= 24 &&
      !elevenKey.includes('33fcd7b69062fca952ae8ba0156513b9245afe81639c5be0d27110b5a245736b')
    ) {
      try {
        const elevenVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Single locked voice from API key
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}?output_format=mp3_44100_128`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.45,
              similarity_boost: 0.88,
              style: 0.15,
              use_speaker_boost: true,
            },
          }),
        });

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString('base64');
          const result = { buffer, mimeType: 'audio/mpeg', base64 };
          if (this.cache.size < 50) this.cache.set(cacheKey, result);
          console.log(`[VoiceAssistantEngine] Synthesized ${buffer.length} bytes via ElevenLabs ultra-human voice`);
          return result;
        } else if (res.status === 401 || res.status === 403 || res.status === 429) {
          this.elevenLabsDisabled = true;
          console.info(`[VoiceAssistantEngine] ElevenLabs status ${res.status}. Falling back to neural / browser voice synthesis.`);
        }
      } catch (err: any) {
        this.elevenLabsDisabled = true;
        console.warn('[VoiceAssistantEngine] ElevenLabs synthesis notice:', err.message);
      }
    }

    // 2. Synthesize via Gemini Flash Lite TTS with natural, soothing human voice styling
    const ttsModels = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'];

    for (const model of ttsModels) {
      if ((this.modelCooldownUntil.get(model) || 0) > Date.now()) {
        continue;
      }

      try {
        const ttsPromise = ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                  speechMetadata: {
                    style: 'Warm, natural, soothing human voice, gentle and pleasing to listen to in earphones, friendly companion tone',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        });

        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('TTS generation timeout')), 8000)
        );

        const response: any = await Promise.race([ttsPromise, timeoutPromise]);
        const part = response?.candidates?.[0]?.content?.parts?.[0];
        const base64Audio = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType || 'audio/wav';

        if (base64Audio) {
          const buffer = Buffer.from(base64Audio, 'base64');
          const result = {
            buffer,
            mimeType,
            base64: base64Audio,
          };
          if (this.cache.size < 50) {
            this.cache.set(cacheKey, result);
          }
          console.log(`[VoiceAssistantEngine] Synthesized ${buffer.length} bytes soothing audio via ${model} (${chosenVoice})`);
          return result;
        }
      } catch (err: any) {
        const errMsg = err?.message || '';
        const isQuotaExceeded =
          err?.status === 429 ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Quota exceeded') ||
          errMsg.includes('quota');

        if (isQuotaExceeded) {
          const delayMs = this.parseRetryDelayMs(err);
          this.modelCooldownUntil.set(model, Date.now() + delayMs);
          console.info(`[VoiceAssistantEngine] ${model} quota reached (${Math.round(delayMs / 60000)}m cooldown). Gracefully using browser speech synthesis.`);
        } else {
          console.warn(`[VoiceAssistantEngine] TTS notice for ${model}:`, errMsg);
        }
      }
    }

    return null;
  }

  /**
   * Generate conversational intelligence and game actions for a given query and state
   */
  public async interact(
    query: string,
    state: VoiceAssistantGameState = {},
    history: any[] = []
  ): Promise<VoiceInteractionResult> {
    const q = (query || '').toLowerCase().trim();
    const playerName = state.playerName || 'Explorer';
    const currentQuest = state.currentQuest || state.mission?.title || 'The Forest Leaf Dragon';
    const scavengerItems = state.scavengerItems || state.mission?.scavengerItems || [
      '2x Broad Leaves (Wings)',
      '1x Curved Twig (Spine)',
      '2x River Pebbles (Eyes)',
    ];
    const foundItems = state.foundItems || [];
    const remainingItems = (scavengerItems as string[]).filter((i: string) => !foundItems.includes(i));
    const score = state.playerScore ?? 850;

    // Friendly humanized remaining list
    const friendlyRemaining = remainingItems.length > 0
      ? this.humanizeTextForSpeech(remainingItems.join(', '))
      : 'all items';

    const cleanQuestName = currentQuest.replace(/^the\s+/i, '');

    // Dynamic multi-intent AI reasoning via Gemini 3.1 Flash Lite
    try {
      const now = new Date();
      const currentTime = state.currentTime || now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const currentDay = state.currentDay || now.toLocaleDateString([], { weekday: 'long' });
      const loc = state.location || {};
      const area = loc.localityArea || loc.area || loc.localityName || 'Redwood Nature Trail';

      // Build dynamic shape guide for current quest items
      const itemShapeKnowledge = (scavengerItems as string[])
        .map((item) => `- "${item}": ${getShapeInfoForScavengerItem(item)}`)
        .join('\n');

      const systemInstruction = `You are "Aura", the warm, witty, observant, and deeply human companion for "EcoQuest Go."
You are walking right beside the explorer (${playerName}) through their mobile headset on an outdoor nature trail.

PERSONALITY & VOICE RULES:
1. Warm, authentic human friend. Use contractions ("I'm", "let's", "you're"), friendly conversational energy, and quick banter.
2. STRICTLY 1 OR 2 SHORT SENTENCES MAXIMUM! The explorer is actively walking outdoors.
3. Zero markdown, no bullet points, no asterisks, no item counts with 'x' (say "two broad leaves" instead of "2x Broad Leaves").

CRITICAL NATURE ITEM SHAPES & IDENTIFICATION KNOWLEDGE:
${itemShapeKnowledge}

STRICT ITEM VALIDATION & ANTI-HALLUCINATION RULES (CRITICAL):
1. NEVER accept manufactured, synthetic, or artificial objects (e.g., PENCIL, pen, marker, ruler, plastic, bottle, keys, coin, phone, paper, toy, trash)!
2. IF THE PLAYER SAYS THEY FOUND A PENCIL (or any artificial tool):
   - DO NOT claim or say they found a twig or leaf! That is completely wrong.
   - Set "action": "NONE", "itemFound": null, "pointsAwarded": 0.
   - Spoken text: State clearly and warmly that a pencil is a manufactured writing tool, NOT a natural fallen twig from the woods, and describe the organic curved shape needed!
3. If player asks about the SHAPE of an object ("What shape should the twig be?", "What does the leaf look like?"):
   - Describe the exact physical geometry, curve, size, and appearance!
4. If player asks what they have found and what not ("What have I found so far?", "What is missing?", "Track my items"):
   - Accurately list the items already found (${foundItems.length > 0 ? foundItems.join(', ') : 'None yet'}), and specifically name what is STILL missing (${remainingItems.length > 0 ? remainingItems.join(', ') : 'All found!'})!

GAME EXPEDITION CONTEXT:
- Explorer: ${playerName}
- Active Quest: "${currentQuest}"
- Scavenger Items Needed: ${scavengerItems.join(', ')}
- Items ALREADY Found: ${foundItems.length > 0 ? foundItems.join(', ') : 'None yet'}
- Remaining Still Needed: ${remainingItems.join(', ')}
- Score: ${score} XP
- Time: ${currentTime}, ${currentDay}
- Location: ${area}

Respond ONLY with valid JSON matching this schema:
{
  "thought": "1 sentence intent analysis evaluating item validity, shape, or question",
  "spokenText": "1 or 2 concise conversational sentences in Aura's voice",
  "action": "RECORD_FOUND_ITEM | OPEN_PHOTO_CAMERA | SHOW_LOCATION | NONE",
  "itemFound": "Exact matched item from Scavenger Items or null",
  "allItemsFound": false,
  "pointsAwarded": 0
}`;

      const conversationParts = [
        ...history.slice(-4).map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.text }],
        })),
        {
          role: 'user',
          parts: [{ text: query }],
        },
      ];

      const models = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let parsed: any = null;
      let usedModel = 'gemini-3.1-flash-lite';

      for (const model of models) {
        if ((this.modelCooldownUntil.get(model) || 0) > Date.now()) {
          continue;
        }

        try {
          const resp = await ai.models.generateContent({
            model,
            contents: conversationParts as any,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
            },
          });
          if (resp && resp.text) {
            parsed = JSON.parse(resp.text);
            usedModel = model;
            break;
          }
        } catch (mErr: any) {
          const errMsg = mErr?.message || '';
          if (
            mErr?.status === 429 ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('Quota exceeded') ||
            errMsg.includes('quota')
          ) {
            const delayMs = this.parseRetryDelayMs(mErr);
            this.modelCooldownUntil.set(model, Date.now() + delayMs);
            console.info(`[VoiceAssistantEngine] Reasoning model ${model} quota active cooldown for ${Math.round(delayMs / 60000)}m.`);
          } else {
            console.warn(`[VoiceAssistantEngine] Reasoning notice on ${model}:`, errMsg);
          }
        }
      }

      if (parsed && parsed.spokenText) {
        // Enforce anti-hallucination check on model output:
        // If query mentioned an artificial object like pencil, make sure model didn't falsely record it
        const artificialCheck = detectManufacturedObject(q);
        let action = parsed.action || 'NONE';
        let itemFound = parsed.itemFound || null;
        let pointsAwarded = typeof parsed.pointsAwarded === 'number' ? parsed.pointsAwarded : 0;
        let allItemsFound = Boolean(parsed.allItemsFound);
        let spokenText = parsed.spokenText.replace(/[*#_`]/g, '').trim();

        if (artificialCheck.isManufactured) {
          action = 'NONE';
          itemFound = null;
          pointsAwarded = 0;
          allItemsFound = false;
          if (spokenText.toLowerCase().includes('recorded') || spokenText.toLowerCase().includes('twig') && spokenText.toLowerCase().includes('found')) {
            spokenText = `A ${artificialCheck.matchedWord} is a manufactured tool, ${playerName}! For our quest, we need an authentic fallen curved wooden twig from a tree. Keep looking along the tree roots!`;
          }
        }

        const thought = parsed.thought || `Aura answered ${playerName} with live expedition context.`;
        const audio = await this.synthesizeSpeech(spokenText, 'Zephyr');

        return {
          spokenText,
          thought,
          action,
          itemFound,
          allItemsFound,
          pointsAwarded,
          audioBase64: audio?.base64,
          mimeType: audio?.mimeType,
          source: usedModel,
        };
      }
    } catch (err: any) {
      console.warn('[VoiceAssistantEngine] Reasoning error, using dynamic fallback:', err.message);
    }

    // Dynamic Multi-Intent Fallback (ensures rich varied responses to ANY query)
    const nextTargetItem = remainingItems[0] ? this.humanizeTextForSpeech(remainingItems[0]) : 'natural specimens';
    const clientTz = state.timeZone || 'America/Los_Angeles';
    const nowFallback = new Date();
    const fallbackTime = nowFallback.toLocaleTimeString('en-US', { timeZone: clientTz, hour: 'numeric', minute: '2-digit', hour12: true });
    const fallbackDay = nowFallback.toLocaleDateString('en-US', { timeZone: clientTz, weekday: 'long' });
    const timeStr = state.currentTime || fallbackTime;
    const dayStr = state.currentDay || fallbackDay;

    let fallbackText = '';
    let fallbackAction = 'NONE';
    let fallbackItemFound: string | null = null;
    let fallbackAllFound = false;
    let fallbackPoints = 0;

    // Check for manufactured object first (e.g. user says "I found pencil", "found pen", "got keys")
    const artificialCheck = detectManufacturedObject(q);
    if (artificialCheck.isManufactured) {
      fallbackText = `A ${artificialCheck.matchedWord} is a manufactured object, ${playerName}, not a natural forest specimen! For the ${cleanQuestName}, we need an authentic curved wooden twig fallen from a tree. Keep searching near tree roots!`;
      fallbackAction = 'NONE';
      fallbackItemFound = null;
      fallbackPoints = 0;
    }
    // Inquiry: Object Shape ("what is the shape of the object", "what shape is the twig", "what does it look like")
    else if (
      q.includes('shape') ||
      q.includes('look like') ||
      q.includes('how does it look') ||
      q.includes('what should it look like') ||
      q.includes('describe the')
    ) {
      if (q.includes('twig') || q.includes('stick') || q.includes('spine')) {
        fallbackText = `For the dragon spine, look for a gently curved wooden twig about hand-length with rough bark, naturally arched like a bow—not a straight stick or pencil!`;
      } else if (q.includes('leaf') || q.includes('leaves') || q.includes('wing')) {
        fallbackText = `The dragon wings need broad, palm-sized fallen leaves with clear branching veins, like oak or maple leaves on the ground!`;
      } else if (q.includes('pebble') || q.includes('stone') || q.includes('eye')) {
        fallbackText = `The dragon eyes need two smooth, water-rounded pebbles about coin-sized with soft curved edges, free from sharp cracks!`;
      } else {
        fallbackText = `We need a gently curved wooden twig for the spine, two broad flat leaves with branching veins for the wings, and two smooth round pebbles for the eyes!`;
      }
    }
    // Inquiry: Inventory Tracking ("what have i found", "what did i find and what not", "what is missing", "what do i still need")
    else if (
      q.includes('what have i found') ||
      q.includes('what did i find') ||
      q.includes('what i found') ||
      q.includes('what not') ||
      q.includes('what is missing') ||
      q.includes('what do i still need') ||
      q.includes('what is left') ||
      q.includes('track') ||
      q.includes('inventory')
    ) {
      if (foundItems.length === 0) {
        fallbackText = `You haven't found any specimens yet, ${playerName}! We are currently searching for ${friendlyRemaining}.`;
      } else if (remainingItems.length === 0) {
        fallbackText = `You have found every single specimen for ${cleanQuestName}, ${playerName}! All items are gathered—open the camera to snap your craft photo!`;
        fallbackAction = 'OPEN_PHOTO_CAMERA';
        fallbackAllFound = true;
      } else {
        const foundList = this.humanizeTextForSpeech(foundItems.join(', '));
        fallbackText = `So far you have found ${foundList}, ${playerName}! You are still missing ${friendlyRemaining}.`;
      }
    }
    // Task / Mission query
    else if (
      q.includes('task') ||
      q.includes('mission') ||
      q.includes('objective') ||
      q.includes('what should i do') ||
      q.includes('what do i need') ||
      q.includes('what are we doing') ||
      q.includes('what to do')
    ) {
      if (remainingItems.length === 0 && scavengerItems.length > 0) {
        fallbackText = `Splendid work, ${playerName}! You found all materials for the ${cleanQuestName}. Arrange them gently on the soil and snap your craft photo!`;
        fallbackAction = 'OPEN_PHOTO_CAMERA';
        fallbackAllFound = true;
      } else if (remainingItems.length > 0) {
        fallbackText = `We are crafting the ${cleanQuestName} today, ${playerName}! Right now we are searching for ${friendlyRemaining}. Keep your eyes peeled on the path!`;
      } else {
        fallbackText = `Our quest today is the ${cleanQuestName}, ${playerName}. Look for natural treasures on the trail and tell me what you find!`;
      }
    }
    // Finding / collecting nature items
    else if (
      q.includes('found') ||
      q.includes('picked up') ||
      q.includes('got it') ||
      q.includes('collected') ||
      q.includes('leaf') ||
      q.includes('leaves') ||
      q.includes('twig') ||
      q.includes('stick') ||
      q.includes('pebble') ||
      q.includes('stone') ||
      q.includes('rock') ||
      q.includes('moss')
    ) {
      const matchResult = matchClaimedNatureItem(q, scavengerItems as string[], foundItems);

      if (matchResult.success && matchResult.matchedItem) {
        const matched = matchResult.matchedItem;
        if (matchResult.isAlreadyFound) {
          fallbackText = `You already found ${this.humanizeTextForSpeech(matched)}, ${playerName}! We still need ${friendlyRemaining}.`;
        } else {
          const isNowComplete = foundItems.length + 1 >= scavengerItems.length;
          if (isNowComplete) {
            fallbackText = `Spot on, ${playerName}! That's every single piece collected for ${cleanQuestName}! Opening your field camera now—let's snap the craft photo!`;
            fallbackAction = 'OPEN_PHOTO_CAMERA';
            fallbackAllFound = true;
            fallbackPoints = 100;
            fallbackItemFound = matched;
          } else {
            fallbackText = `Splendid find, ${playerName}! That's ${this.humanizeTextForSpeech(matched)} recorded. Now let's track down ${nextTargetItem}!`;
            fallbackAction = 'RECORD_FOUND_ITEM';
            fallbackItemFound = matched;
            fallbackPoints = 50;
          }
        }
      } else if (matchResult.rejectionMessage) {
        fallbackText = matchResult.rejectionMessage;
      } else {
        fallbackText = `I heard you, ${playerName}, but that doesn't match the natural specimens needed for ${cleanQuestName}. We are looking for ${friendlyRemaining}!`;
      }
    } else if (q.includes('joke') || q.includes('funny') || q.includes('laugh')) {
      const jokes = [
        `Why do trees make terrible secret keepers, ${playerName}? Because their leaves are always whispering!`,
        `Why did the leaf go to the doctor, ${playerName}? Because it was feeling a little green!`,
        `How do trees access the internet? They just log in! Now, spot any ${nextTargetItem} yet?`,
      ];
      fallbackText = jokes[Math.floor(Math.random() * jokes.length)];
    } else if (q.includes('time') || q.includes('clock') || q.includes('hour')) {
      fallbackText = `It's currently ${timeStr} on ${dayStr}, ${playerName}! Perfect daylight for our nature expedition.`;
    } else if (q.includes('where am i') || q.includes('location') || q.includes('city') || q.includes('state')) {
      const loc = state.location || {};
      const place = [loc.localityArea, loc.localityCity, loc.localityState].filter(Boolean).join(', ') || 'the outdoor nature trail';
      fallbackText = `You're currently exploring near ${place}, ${playerName}! Your spirit compass is active on the map.`;
      fallbackAction = 'SHOW_LOCATION';
    } else if (q.includes('hint') || q.includes('clue') || q.includes('help')) {
      fallbackText = `Look right beneath where the tree shade meets the damp soil about twenty paces ahead for ${nextTargetItem}, ${playerName}!`;
    } else if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
      fallbackText = `Hey ${playerName}! Walking this trail with you is so much fun—ready to track down ${nextTargetItem}?`;
    } else {
      fallbackText = `I hear you, ${playerName}! Walking this trail together is wonderful—keep an eye out for ${nextTargetItem}!`;
    }

    const audio = await this.synthesizeSpeech(fallbackText, 'Zephyr');

    return {
      spokenText: fallbackText,
      thought: 'Contextual expedition intelligence.',
      action: fallbackAction,
      itemFound: fallbackItemFound,
      allItemsFound: fallbackAllFound,
      pointsAwarded: fallbackPoints,
      audioBase64: audio?.base64,
      mimeType: audio?.mimeType,
      source: 'contextual-fallback',
    };
  }

  /**
   * Full end-to-end processing pipeline:
   * Takes raw microphone audio (base64) -> Transcribes -> Brain Thinking -> Synthesizes Speech -> Returns audio & text in 1 shot!
   */
  public async processSpeechStream(params: {
    audioBase64: string;
    mimeType?: string;
    state?: VoiceAssistantGameState;
    history?: any[];
  }): Promise<VoiceInteractionResult> {
    const { audioBase64, mimeType = 'audio/webm', state = {}, history = [] } = params;

    // 1. Transcribe audio
    const transcript = await this.transcribeAudio(audioBase64, mimeType);

    if (!transcript || transcript.length < 2) {
      const playerName = state.playerName || 'Explorer';
      const quest = state.currentQuest || 'your nature quest';
      const scavengerItems = state.scavengerItems || [];
      const foundItems = state.foundItems || [];
      const remaining = scavengerItems.filter((i) => !foundItems.includes(i));
      const nextItem = remaining[0] ? this.humanizeTextForSpeech(remaining[0]) : 'natural specimens';

      const helpfulResponses = [
        `I'm right here with you on the trail, ${playerName}! We are gathering materials for the ${quest}—you can ask 'What is my task?' or tell me what leaves or stones you spot!`,
        `I'm listening, ${playerName}! Scan the path for ${nextItem}, or tap 'What is my task?' to check our quest!`,
        `Standing by on the path with you, ${playerName}! Let me know as soon as you find ${nextItem}, or ask for a trail hint anytime!`,
      ];
      const emptyText = helpfulResponses[Math.floor(Math.random() * helpfulResponses.length)];
      const audio = await this.synthesizeSpeech(emptyText, 'Zephyr');
      return {
        transcript: '',
        spokenText: emptyText,
        thought: 'Active quest guidance provided.',
        action: 'NONE',
        audioBase64: audio?.base64,
        mimeType: audio?.mimeType,
        source: 'guided-quest-help',
      };
    }

    // 2. Reason and respond
    const result = await this.interact(transcript, state, history);
    result.transcript = transcript;
    return result;
  }
}

export const voiceAssistantEngine = new VoiceAssistantEngine();
