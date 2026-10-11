import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, xi-api-key');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { audioBase64, mimeType = 'audio/webm', history = [] } = body;
    const state = body.state || {};
    const playerName = state.playerName || body.explorerName || 'Explorer';
    const currentQuest = state.currentQuest || state.mission?.title || 'The Forest Leaf Dragon';
    const questPhase = state.questPhase || state.mission?.craftInstructions || 'Phase 1: Gathering Nature Ingredients';
    const scavengerItems = state.scavengerItems || ['2x Broad Leaves (Wings)', '1x Curved Twig (Spine)', '2x River Pebbles (Eyes)'];
    const foundItems = state.foundItems || [];
    const remaining = scavengerItems.filter((i: string) => !foundItems.includes(i));
    const telemetry = state.location || state.telemetry || {};

    const now = new Date();
    const currentTime = state.currentTime || now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const currentDay = state.currentDay || now.toLocaleDateString([], { weekday: 'long' });

    let transcribedText = '';

    // 1. Transcribe audio using Gemini Transcription models if audio is provided
    if (process.env.GEMINI_API_KEY && audioBase64 && typeof audioBase64 === 'string') {
      const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
      const cleanMime = (mimeType || 'audio/webm').split(';')[0].trim();
      const models = ['gemini-3.5-transcribe', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];

      for (const m of models) {
        try {
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });
          const transcribeRes = await ai.models.generateContent({
            model: m,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMime || 'audio/webm',
                    data: cleanBase64,
                  },
                },
                {
                  text: 'Transcribe the spoken English in this audio recording word-for-word. Output ONLY the words spoken. If the audio is completely silent, background noise only, or contains no speech, respond with EMPTY.',
                },
              ],
            },
          });

          const rawText = (transcribeRes.text || '').trim();
          if (
            rawText &&
            rawText.toUpperCase() !== 'EMPTY' &&
            rawText.toUpperCase() !== '[SILENCE]' &&
            !rawText.includes('00:00:00') &&
            rawText.length >= 2
          ) {
            transcribedText = rawText.replace(/^["']|["']$/g, '').trim();
            break;
          }
        } catch (transcribeErr: any) {
          console.warn(`[Vercel Voice Assistant] Transcribe notice on ${m}:`, transcribeErr.message);
        }
      }
    }

    const query = transcribedText || body.query || '';

    // If still no speech detected, return helpful dynamic guidance
    if (!query) {
      const nextTargetItem = remaining[0]
        ? remaining[0].replace(/2x\s*/gi, 'two ').replace(/1x\s*/gi, 'one ').replace(/3x\s*/gi, 'three ')
        : 'natural specimens';

      const helpfulGreetings = [
        `I'm right here with you on the trail, ${playerName}! We are gathering materials for ${currentQuest}—you can ask 'What is my task?' or tell me what leaves or stones you spot!`,
        `I'm listening, ${playerName}! Keep your eyes peeled on the path for ${nextTargetItem}, or tap 'What is my task?' to check our active objective!`,
        `Standing by on the path with you, ${playerName}! Let me know as soon as you find ${nextTargetItem}, or ask for a trail clue anytime!`,
      ];
      const emptyHelpText = helpfulGreetings[Math.floor(Math.random() * helpfulGreetings.length)];

      return res.status(200).json({
        success: true,
        transcript: '',
        spokenText: emptyHelpText,
        thought: 'Active quest guidance provided.',
        action: 'NONE',
        itemFound: null,
        allItemsFound: false,
        pointsAwarded: 0,
        audioBase64: null,
        audioMimeType: 'audio/mpeg',
        source: 'guided-quest-help',
      });
    }

    let spokenText = '';
    let thought = '';
    let action = 'NONE';
    let itemFound: string | null = null;
    let allItemsFound = false;
    let pointsAwarded = 0;

    // 2. Generate intelligent dynamic answer with Gemini 3.1 Flash Lite
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        const prompt = `You are Aura, the hyper-intelligent, warm, and deeply human outdoor companion for "EcoQuest Go."
You are walking right beside ${playerName} on an outdoor nature expedition.

ACTIVE QUEST SPECIFICATIONS:
- Quest: "${currentQuest}"
- Phase: "${questPhase}"
- Required Items: ${JSON.stringify(scavengerItems)}
- Items Already Found: ${JSON.stringify(foundItems)}
- Remaining Needed: ${JSON.stringify(remaining)}
- Player Name: ${playerName}
- Time: ${currentTime}, ${currentDay}
- Telemetry: ${JSON.stringify(telemetry)}

PERSONALITY & VOICE RULES:
1. Speak as a real human friend walking beside the player through earphones.
2. Keep spokenText to 1 OR 2 SHORT SENTENCES MAXIMUM!
3. Natural phrasing, contractions ("I'm", "let's", "you're"), zero markdown or bullet points.
4. If player reports finding an item (leaves, twigs, pebbles, etc.), acknowledge and reward it.
5. If player asks about time, location, tasks, jokes, or nature trivia, answer dynamically and specifically!

PLAYER SPOKEN INPUT:
"${query}"

Respond ONLY with valid JSON:
{
  "thought": "1 sentence intent analysis",
  "spokenText": "1 or 2 concise conversational sentences in Aura's voice",
  "action": "RECORD_FOUND_ITEM | OPEN_PHOTO_CAMERA | SHOW_LOCATION | NONE",
  "itemFound": "Matched item from Required Items or null",
  "allItemsFound": false,
  "pointsAwarded": 0
}`;

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (geminiRes && geminiRes.text) {
          const parsed = JSON.parse(geminiRes.text);
          if (parsed.spokenText) {
            spokenText = parsed.spokenText.replace(/[*#_`]/g, '').trim();
            thought = parsed.thought || 'Aura processed your voice with Gemini.';
            action = parsed.action || 'NONE';
            itemFound = parsed.itemFound || null;
            allItemsFound = Boolean(parsed.allItemsFound);
            pointsAwarded = typeof parsed.pointsAwarded === 'number' ? parsed.pointsAwarded : 0;
          }
        }
      } catch (geminiErr: any) {
        console.warn('[Vercel Voice Assistant] Reasoning notice:', geminiErr.message);
      }
    }

    // 3. Dynamic multi-intent fallback if Gemini is offline or rate-limited
    if (!spokenText) {
      const q = query.toLowerCase();
      const nextTargetItem = remaining[0] || 'the next nature specimen';

      if (
        q.includes('task') ||
        q.includes('mission') ||
        q.includes('objective') ||
        q.includes('what should i do') ||
        q.includes('what do i need') ||
        q.includes('what to do')
      ) {
        if (remaining.length === 0 && scavengerItems.length > 0) {
          spokenText = `Splendid work, ${playerName}! You've collected every specimen for ${currentQuest}. Place them on the ground and capture your creation!`;
          action = 'OPEN_PHOTO_CAMERA';
          allItemsFound = true;
        } else if (remaining.length > 0) {
          const friendlyList = remaining
            .join(', ')
            .replace(/2x\s*/gi, 'two ')
            .replace(/1x\s*/gi, 'one ')
            .replace(/3x\s*/gi, 'three ');
          spokenText = `We are crafting the ${currentQuest}, ${playerName}! We need ${friendlyList}. Scan the path around you!`;
        } else {
          spokenText = `Our quest is the ${currentQuest}, ${playerName}. Enjoy the fresh air, explore the trail, and tell me what you spot!`;
        }
        thought = 'Guided player on active quest objective.';
      } else if (
        q.includes('found') ||
        q.includes('picked up') ||
        q.includes('got it') ||
        q.includes('collected') ||
        q.includes('leaf') ||
        q.includes('leaves') ||
        q.includes('twig') ||
        q.includes('pebble') ||
        q.includes('stone') ||
        q.includes('rock') ||
        q.includes('moss')
      ) {
        let matched =
          remaining.find((i: string) => {
            const lower = i.toLowerCase();
            if (q.includes('leaf') || q.includes('leaves')) return lower.includes('leaf');
            if (q.includes('twig') || q.includes('stick')) return lower.includes('twig');
            if (q.includes('pebble') || q.includes('stone') || q.includes('rock'))
              return lower.includes('pebble') || lower.includes('stone');
            return false;
          }) || remaining[0];

        const updatedCount = foundItems.length + 1;
        if (updatedCount >= scavengerItems.length) {
          spokenText = `Spot on, ${playerName}! That's every single specimen for ${currentQuest}! Opening the camera box now—arrange them on the ground and snap your craft photo!`;
          action = 'OPEN_PHOTO_CAMERA';
          allItemsFound = true;
          pointsAwarded = 100;
        } else {
          spokenText = `Spot on, ${playerName}! That's ${matched} secured—awarding fifty points! Now let's track down ${nextTargetItem}!`;
          action = 'RECORD_FOUND_ITEM';
          itemFound = matched;
          pointsAwarded = 50;
        }
        thought = `Recorded discovery of nature item for ${playerName}.`;
      } else if (q.includes('joke') || q.includes('funny') || q.includes('laugh')) {
        spokenText = `Why do trees make terrible secret keepers, ${playerName}? Because their leaves are always whispering! Ready to find ${nextTargetItem}?`;
        thought = 'Shared a witty outdoor joke.';
      } else if (q.includes('time') || q.includes('clock') || q.includes('hour')) {
        spokenText = `It's currently ${currentTime} on ${currentDay}, ${playerName}! Great lighting on the trail for our quest.`;
        thought = 'Answered with real current time and day.';
      } else if (q.includes('where am i') || q.includes('location') || q.includes('city') || q.includes('state')) {
        const place =
          [telemetry.localityArea, telemetry.localityCity, telemetry.localityState].filter(Boolean).join(', ') ||
          'the outdoor nature trail';
        spokenText = `You're currently exploring near ${place}, ${playerName}! Your spirit beacon is centered right on the map.`;
        action = 'SHOW_LOCATION';
        thought = 'Spoke player real geographic location.';
      } else if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('who are you')) {
        spokenText = `Hey ${playerName}! I am Aura, your expedition guide. The air is crisp today—ready to track down ${nextTargetItem}?`;
        thought = 'Welcomed player with upbeat companion banter.';
      } else if (q.includes('hint') || q.includes('clue') || q.includes('help')) {
        spokenText = `Look right beneath where the tree shade meets the damp soil about twenty paces ahead for ${nextTargetItem}, ${playerName}!`;
        thought = 'Gave localized nature clue.';
      } else {
        spokenText = `I hear you loud and clear on the trail, ${playerName}! Let's keep exploring and spot ${nextTargetItem}!`;
        thought = 'Conversational dynamic check-in.';
      }
    }

    // 4. Synthesize voice audio using ElevenLabs Sarah
    const elevenKey = (
      process.env.ELEVENLABS_API_KEY ||
      'sk_c7e4055e524972719127dde61105da5411bf1570e693e5d2'
    ).trim();
    const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Authentic human companion voice

    let audioBase64Out: string | null = null;
    try {
      const elevenRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': elevenKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text: spokenText.slice(0, 1500),
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.38,
              similarity_boost: 0.85,
              style: 0.2,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (elevenRes.ok) {
        const arrayBuf = await elevenRes.arrayBuffer();
        audioBase64Out = Buffer.from(arrayBuf).toString('base64');
      }
    } catch (_) {}

    return res.status(200).json({
      success: true,
      transcript: query,
      spokenText,
      thought: thought || 'Audio processed via Aura Brain.',
      action,
      itemFound,
      allItemsFound,
      pointsAwarded,
      audioBase64: audioBase64Out,
      audioMimeType: 'audio/mpeg',
      source: 'gemini-flash-elevenlabs',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
