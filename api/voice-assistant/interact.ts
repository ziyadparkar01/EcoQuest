import { GoogleGenAI } from '@google/genai';
import {
  detectManufacturedObject,
  matchClaimedNatureItem,
  getShapeInfoForScavengerItem,
} from '../../src/data/natureItemShapes.ts';

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
    const query = (body.query || '').trim();
    const playerName = body.playerName || body.explorerName || 'Explorer';
    const currentQuest = body.currentQuest || 'The Forest Leaf Dragon';
    const questPhase = body.questPhase || 'Phase 1: Gathering Nature Ingredients';
    const scavengerItems = body.scavengerItems || ['2x Broad Leaves (Wings)', '1x Curved Twig (Spine)', '2x River Pebbles (Eyes)'];
    const foundItems = body.foundItems || [];
    const remaining = scavengerItems.filter((i: string) => !foundItems.includes(i));
    const history = body.history || [];
    const telemetry = body.telemetry || {};

    const userTz = body.timeZone || 'America/Los_Angeles';
    const now = new Date();
    const fallbackTime = now.toLocaleTimeString('en-US', { timeZone: userTz, hour: 'numeric', minute: '2-digit', hour12: true });
    const fallbackDay = now.toLocaleDateString('en-US', { timeZone: userTz, weekday: 'long' });
    const currentTime = body.currentTime || fallbackTime;
    const currentDay = body.currentDay || fallbackDay;

    let spokenText = '';
    let thought = '';
    let action = 'NONE';
    let itemFound: string | null = null;
    let allItemsFound = false;
    let pointsAwarded = 0;

    // 1. Try Gemini AI Model first if GEMINI_API_KEY is available
    if (process.env.GEMINI_API_KEY && query) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const shapeGuide = (scavengerItems as string[])
          .map((i) => `- "${i}": ${getShapeInfoForScavengerItem(i)}`)
          .join('\n');

        const prompt = `You are Aura, the hyper-intelligent, warm, witty, and deeply human outdoor nature companion for "EcoQuest Go."
You are walking right beside the player (${playerName}) through their mobile headset on an outdoor expedition.

ACTIVE QUEST SPECIFICATIONS:
- Quest: "${currentQuest}"
- Phase: "${questPhase}"
- Required Items: ${JSON.stringify(scavengerItems)}
- Items Already Found: ${JSON.stringify(foundItems)}
- Remaining Needed: ${JSON.stringify(remaining)}
- Player Name: ${playerName}
- Time: ${currentTime}, ${currentDay}
- Telemetry: ${JSON.stringify(telemetry)}

CRITICAL NATURE ITEM SHAPES & KNOWLEDGE:
${shapeGuide}

STRICT VALIDATION & ANTI-HALLUCINATION:
1. NEVER accept manufactured or synthetic items (like PENCIL, pen, plastic, keys, phone, coins, paper)!
2. IF PLAYER SAYS THEY FOUND A PENCIL (or manufactured object):
   - DO NOT say they found a twig or leaf! Set action: "NONE", itemFound: null, pointsAwarded: 0.
   - Spoken text: State that a pencil is an artificial writing tool, not a natural fallen twig from the woods, and describe the curved twig needed!
3. If player asks about the SHAPE of an object, describe its exact geometry and curvature!
4. If player asks what they have found and what not, accurately list found vs missing items!

PERSONALITY & VOICE RULES:
1. Ultra-human, friendly, and authentic. Speak as a friend walking along the trail.
2. Keep spokenText to 1 OR 2 SHORT SENTENCES MAXIMUM! The player is walking outdoors.
3. Natural phrasing, contractions ("I'm", "let's", "you're"), zero markdown or bullet points.

PLAYER SPOKEN INPUT:
"${query}"

Respond ONLY with valid JSON:
{
  "thought": "1 sentence intent analysis",
  "spokenText": "1 or 2 concise conversational sentences in Aura's voice",
  "action": "RECORD_FOUND_ITEM | OPEN_PHOTO_CAMERA | NONE",
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

            const manCheck = detectManufacturedObject(query);
            if (manCheck.isManufactured) {
              action = 'NONE';
              itemFound = null;
              pointsAwarded = 0;
              allItemsFound = false;
              if (spokenText.toLowerCase().includes('recorded') || (spokenText.toLowerCase().includes('twig') && spokenText.toLowerCase().includes('found'))) {
                spokenText = `A ${manCheck.matchedWord} is a manufactured tool, ${playerName}! For our quest, we need an authentic fallen curved wooden twig from a tree. Keep looking along tree roots!`;
              }
            }
          }
        }
      } catch (geminiErr) {
        console.warn('[Vercel Voice Assistant] Gemini processing notice:', geminiErr);
      }
    }

    // 2. Dynamic multi-intent fallback if Gemini was not available or didn't produce text
    if (!spokenText) {
      const q = query.toLowerCase();
      const friendlyRemaining = remaining
        .join(', ')
        .replace(/2x\s*/gi, 'two ')
        .replace(/1x\s*/gi, 'one ')
        .replace(/3x\s*/gi, 'three ');
      const nextTargetItem = remaining[0]
        ? remaining[0].replace(/2x\s*/gi, 'two ').replace(/1x\s*/gi, 'one ')
        : 'the next nature specimen';

      const manCheck = detectManufacturedObject(q);
      if (manCheck.isManufactured) {
        spokenText = `A ${manCheck.matchedWord} is a manufactured object, ${playerName}, not a natural forest specimen! For ${currentQuest}, we need an authentic curved wooden twig from a tree. Keep looking along tree roots!`;
        thought = `Rejected manufactured item (${manCheck.matchedWord}).`;
        action = 'NONE';
      } else if (
        q.includes('shape') ||
        q.includes('look like') ||
        q.includes('how does it look') ||
        q.includes('what should it look like') ||
        q.includes('describe the')
      ) {
        if (q.includes('twig') || q.includes('stick') || q.includes('spine')) {
          spokenText = `For the dragon spine, look for a gently curved wooden twig about hand-length with rough bark, naturally arched like a bow—not a straight stick or pencil!`;
        } else if (q.includes('leaf') || q.includes('leaves') || q.includes('wing')) {
          spokenText = `The dragon wings need broad, palm-sized fallen leaves with clear branching veins, like oak or maple leaves on the ground!`;
        } else if (q.includes('pebble') || q.includes('stone') || q.includes('eye')) {
          spokenText = `The dragon eyes need two smooth, water-rounded pebbles about coin-sized with soft curved edges, free from sharp cracks!`;
        } else {
          spokenText = `We need a gently curved wooden twig for the spine, two broad flat leaves with branching veins for the wings, and two smooth round pebbles for the eyes!`;
        }
        thought = 'Explained physical shapes of required quest items.';
      } else if (
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
          spokenText = `You haven't found any specimens yet, ${playerName}! We are currently searching for ${friendlyRemaining}.`;
        } else if (remaining.length === 0) {
          spokenText = `You have found every single specimen for ${currentQuest}, ${playerName}! All items are gathered—open the camera to snap your craft photo!`;
          action = 'OPEN_PHOTO_CAMERA';
          allItemsFound = true;
        } else {
          const foundFriendly = foundItems.join(', ').replace(/2x\s*/gi, 'two ').replace(/1x\s*/gi, 'one ');
          spokenText = `So far you have found ${foundFriendly}, ${playerName}! You are still missing ${friendlyRemaining}.`;
        }
        thought = 'Reported found vs missing quest items.';
      } else if (q.includes('task') || q.includes('mission') || q.includes('objective') || q.includes('what should i do') || q.includes('what do i need') || q.includes('what to do')) {
        if (remaining.length === 0 && scavengerItems.length > 0) {
          spokenText = `Splendid work, ${playerName}! You've collected every specimen for ${currentQuest}. Arrange them on the ground and capture your creation!`;
          action = 'OPEN_PHOTO_CAMERA';
          allItemsFound = true;
        } else if (remaining.length > 0) {
          spokenText = `We are crafting the ${currentQuest}, ${playerName}! We need ${friendlyRemaining}. Scan the path around you!`;
        } else {
          spokenText = `Our quest is the ${currentQuest}, ${playerName}. Enjoy the fresh air, explore the trail, and tell me what you spot!`;
        }
        thought = 'Guided player on active quest objective.';
      } else if (q.includes('found') || q.includes('picked up') || q.includes('got it') || q.includes('collected') || q.includes('leaf') || q.includes('twig') || q.includes('pebble') || q.includes('stone') || q.includes('moss') || q.includes('pinecone')) {
        const matchResult = matchClaimedNatureItem(q, scavengerItems as string[], foundItems);

        if (matchResult.success && matchResult.matchedItem) {
          const matched = matchResult.matchedItem;
          if (matchResult.isAlreadyFound) {
            spokenText = `You already found ${matched}, ${playerName}! We still need ${friendlyRemaining}.`;
          } else {
            const updatedCount = foundItems.length + 1;
            if (updatedCount >= scavengerItems.length) {
              spokenText = `Spot on, ${playerName}! That's every single specimen for ${currentQuest}! Opening the camera box now—arrange them on the ground and snap your craft photo!`;
              action = 'OPEN_PHOTO_CAMERA';
              allItemsFound = true;
              pointsAwarded = 100;
              itemFound = matched;
            } else {
              spokenText = `Spot on, ${playerName}! That's ${matched} secured—awarding fifty points! Now let's track down ${nextTargetItem}!`;
              action = 'RECORD_FOUND_ITEM';
              itemFound = matched;
              pointsAwarded = 50;
            }
          }
        } else if (matchResult.rejectionMessage) {
          spokenText = matchResult.rejectionMessage;
        } else {
          spokenText = `I heard you, ${playerName}, but that doesn't match the natural specimens needed for ${currentQuest}. We need ${friendlyRemaining}!`;
        }
        thought = `Evaluated discovery of nature item for ${playerName}.`;
      } else if (q.includes('joke') || q.includes('funny') || q.includes('laugh')) {
        spokenText = `Why do trees make terrible secret keepers, ${playerName}? Because their leaves are always whispering! Ready to find ${nextTargetItem}?`;
        thought = 'Shared a witty outdoor joke.';
      } else if (q.includes('time') || q.includes('clock') || q.includes('hour')) {
        spokenText = `It's currently ${currentTime} on ${currentDay}, ${playerName}! Great lighting on the trail for our quest.`;
        thought = 'Answered with real current time and day.';
      } else if (q.includes('where am i') || q.includes('location') || q.includes('city') || q.includes('state')) {
        const place = [telemetry.localityArea, telemetry.localityCity, telemetry.localityState].filter(Boolean).join(', ') || 'the outdoor nature trail';
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
        spokenText = `I hear you, ${playerName}! I am tracking our surroundings—keep an eye out along the path for ${nextTargetItem}!`;
        thought = 'Conversational dynamic check-in.';
      }
    }

    // 3. Synthesize human voice audio via ElevenLabs
    const elevenKey = (
      process.env.ELEVENLABS_API_KEY ||
      'sk_c7e4055e524972719127dde61105da5411bf1570e693e5d2'
    ).trim();
    const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - Authentic human companion voice

    let audioBase64: string | null = null;
    try {
      const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
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
            style: 0.20,
            use_speaker_boost: true,
          },
        }),
      });

      if (elevenRes.ok) {
        const arrayBuf = await elevenRes.arrayBuffer();
        audioBase64 = Buffer.from(arrayBuf).toString('base64');
      }
    } catch (_) {}

    return res.status(200).json({
      success: true,
      spokenText,
      thought: thought || `Aura processed your voice with quest state: ${currentQuest}.`,
      action,
      itemFound,
      allItemsFound,
      pointsAwarded,
      audioBase64,
      audioMimeType: 'audio/mpeg',
      source: 'gemini-elevenlabs-engine',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
