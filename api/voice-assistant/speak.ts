import { voiceAssistantEngine } from '../../server/voice-assistant/voiceAssistantEngine.ts';

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
    const text = (body.text || '').trim();

    if (!text) {
      return res.status(400).json({ error: 'Text prompt required' });
    }

    const audioResult = await voiceAssistantEngine.synthesizeSpeech(text, 'Zephyr');
    if (audioResult && audioResult.buffer) {
      res.setHeader('Content-Type', audioResult.mimeType);
      res.setHeader('Content-Length', audioResult.buffer.byteLength);
      res.setHeader('X-Voice-Engine', 'aura-companion-zephyr');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(audioResult.buffer);
    }

    return res.status(200).json({
      success: false,
      message: 'TTS generation unavailable',
    });
  } catch (err: any) {
    console.error('[Voice Assistant Speak] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
