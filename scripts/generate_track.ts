// Generator for Exclusive Serene Felt Piano & Nature Stream Soundtrack (16-bit Stereo PCM WAV)
// Matches the uploaded 02:01 ambient piano & nature soundscape:
// - Gentle forest stream water ripples & soft distant birdsong / breeze
// - Warm reverberant felt piano playing flowing broken-chord arpeggios & tender lyrical upper-register melody
//   in Bb major / G minor / Eb maj7 / F add9 (~66 BPM)
// - Lush, warm sustained ambient string & synth pad swells underneath
// - Zero drums or percussion — pure serene contemplative piano & nature atmosphere

import fs from 'fs';
import path from 'path';

const SAMPLE_RATE = 24000; // 24 kHz stereo for crisp high piano harmonics & gentle file size
const TOTAL_DURATION = 121.0; // 2 minutes 1 second
const TOTAL_SAMPLES = Math.floor(SAMPLE_RATE * TOTAL_DURATION);

const leftChannel = new Float32Array(TOTAL_SAMPLES);
const rightChannel = new Float32Array(TOTAL_SAMPLES);

// Note frequency helper (MIDI note or note name)
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// MIDI pitch constants (Bb major / G natural minor key signature: Bb, Eb)
// C4=60, D4=62, Eb4=63, F4=65, G4=67, A4=69, Bb4=70
// C5=72, D5=74, Eb5=75, F5=77, G5=79, A5=81, Bb5=82, C6=84, D6=86
const N = {
  Eb2: midiToFreq(39),
  F2: midiToFreq(41),
  G2: midiToFreq(43),
  Bb2: midiToFreq(46),
  C3: midiToFreq(48),
  D3: midiToFreq(50),
  Eb3: midiToFreq(51),
  F3: midiToFreq(53),
  G3: midiToFreq(55),
  A3: midiToFreq(57),
  Bb3: midiToFreq(58),
  C4: midiToFreq(60),
  D4: midiToFreq(62),
  Eb4: midiToFreq(63),
  F4: midiToFreq(65),
  G4: midiToFreq(67),
  A4: midiToFreq(69),
  Bb4: midiToFreq(70),
  C5: midiToFreq(72),
  D5: midiToFreq(74),
  Eb5: midiToFreq(75),
  F5: midiToFreq(77),
  G5: midiToFreq(79),
  A5: midiToFreq(81),
  Bb5: midiToFreq(82),
  C6: midiToFreq(84),
  D6: midiToFreq(86),
};

// Warm felt piano note with natural inharmonicity, soft hammer felt attack, and long sustain pedal decay
function addPianoNote(freq: number, startSec: number, durationSec: number, velocity: number, pan: number) {
  const startSample = Math.floor(startSec * SAMPLE_RATE);
  const lengthSamples = Math.floor(durationSec * SAMPLE_RATE);
  const attackSamples = Math.floor(0.018 * SAMPLE_RATE);

  // Subtle stereo spread based on register
  const leftGain = velocity * (1 - pan * 0.35);
  const rightGain = velocity * (1 + pan * 0.35);

  for (let i = 0; i < lengthSamples; i++) {
    const idx = startSample + i;
    if (idx >= TOTAL_SAMPLES) break;

    const t = i / SAMPLE_RATE;
    const attackEnv = i < attackSamples ? Math.sin((i / attackSamples) * (Math.PI / 2)) : 1.0;
    // Dual-stage piano decay: initial prompt decay + warm sustain pedal tail
    const decayEnv = 0.65 * Math.exp(-t * 1.85) + 0.35 * Math.exp(-t * 0.48);
    // Smooth release at end of note
    const releaseEnv = i > lengthSamples - SAMPLE_RATE * 0.15
      ? Math.max(0, (lengthSamples - i) / (SAMPLE_RATE * 0.15))
      : 1.0;

    const env = attackEnv * decayEnv * releaseEnv;

    // Felt piano harmonic partials (warm fundamental, gentle 2nd/3rd/4th harmonics that mellow quickly)
    const h1 = Math.sin(2 * Math.PI * freq * t);
    const h2 = Math.sin(2 * Math.PI * (freq * 2.0006) * t) * 0.32 * Math.exp(-t * 2.2);
    const h3 = Math.sin(2 * Math.PI * (freq * 3.0018) * t) * 0.11 * Math.exp(-t * 3.5);
    const h4 = Math.sin(2 * Math.PI * (freq * 4.0035) * t) * 0.04 * Math.exp(-t * 5.0);

    const sample = (h1 + h2 + h3 + h4) * env * 0.24;
    leftChannel[idx] += sample * leftGain;
    rightChannel[idx] += sample * rightGain;
  }
}

// Lush warm ambient string/synth pad chord
function addWarmPad(freqs: number[], startSec: number, durationSec: number, amp: number) {
  const startSample = Math.floor(startSec * SAMPLE_RATE);
  const lengthSamples = Math.floor(durationSec * SAMPLE_RATE);
  const fadeSamples = Math.floor(Math.min(1.6, durationSec * 0.35) * SAMPLE_RATE);

  for (let nIdx = 0; nIdx < freqs.length; nIdx++) {
    const freq = freqs[nIdx];
    const pan = (nIdx % 2 === 0 ? -1 : 1) * (0.2 + (nIdx / freqs.length) * 0.25);
    const lGain = 1 - pan * 0.4;
    const rGain = 1 + pan * 0.4;

    for (let i = 0; i < lengthSamples; i++) {
      const idx = startSample + i;
      if (idx >= TOTAL_SAMPLES) break;

      const t = i / SAMPLE_RATE;
      const env =
        i < fadeSamples
          ? 0.5 * (1 - Math.cos((Math.PI * i) / fadeSamples))
          : i > lengthSamples - fadeSamples
          ? 0.5 * (1 - Math.cos((Math.PI * (lengthSamples - i)) / fadeSamples))
          : 1.0;

      // Chorus detuned warm sine + triangle-like 2nd harmonic
      const osc1 = Math.sin(2 * Math.PI * (freq * 0.9985) * t);
      const osc2 = Math.sin(2 * Math.PI * (freq * 1.0015) * t);
      const sub = Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.28;
      const s = (osc1 * 0.45 + osc2 * 0.45 + sub) * amp * env * 0.095;

      leftChannel[idx] += s * lGain;
      rightChannel[idx] += s * rGain;
    }
  }
}

// Subtle forest birdsong chirp (opening & closing nature atmosphere)
function addSoftBirdCall(startSec: number, baseFreq: number, amp: number, pan: number) {
  const startSample = Math.floor(startSec * SAMPLE_RATE);
  const durSamples = Math.floor(0.28 * SAMPLE_RATE);
  for (let i = 0; i < durSamples; i++) {
    const idx = startSample + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / SAMPLE_RATE;
    const env = Math.sin((Math.PI * i) / durSamples) * Math.exp(-t * 4.5);
    const modFreq = baseFreq * (1 + 0.08 * Math.sin(2 * Math.PI * 14 * t));
    const s = Math.sin(2 * Math.PI * modFreq * t) * amp * env * 0.04;
    leftChannel[idx] += s * (1 - pan * 0.5);
    rightChannel[idx] += s * (1 + pan * 0.5);
  }
}

console.log(`Synthesizing 02:01 (${TOTAL_DURATION}s) Serene Piano & Forest Stream Soundtrack...`);

// 1. Gentle continuous forest water stream & breeze bed (stronger at intro 0:00-0:08 and outro 1:52-2:01)
let filterL = 0;
let filterR = 0;
let filterL2 = 0;
let filterR2 = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const sec = i / SAMPLE_RATE;
  // Envelope: prominent in intro & outro, whisper-soft underneath the piano
  const introBoost = sec < 7.0 ? 1.0 - (sec / 7.0) * 0.65 : 0.35;
  const outroBoost = sec > 110.0 ? 0.35 + ((sec - 110.0) / 8.0) * 0.65 : introBoost;
  const masterFade = sec < 1.5 ? sec / 1.5 : sec > 118.5 ? Math.max(0, (121.0 - sec) / 2.5) : 1.0;

  // Filtered pink/brown noise for soothing water stream murmur
  const whiteL = Math.random() * 2 - 1;
  const whiteR = Math.random() * 2 - 1;
  filterL = filterL * 0.965 + whiteL * 0.035;
  filterR = filterR * 0.965 + whiteR * 0.035;
  filterL2 = filterL2 * 0.92 + filterL * 0.08;
  filterR2 = filterR2 * 0.92 + filterR * 0.08;

  const rippleMod = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.35 * sec);
  const waterAmp = 0.032 * outroBoost * masterFade * rippleMod;

  leftChannel[i] += filterL2 * waterAmp;
  rightChannel[i] += filterR2 * waterAmp;
}

// Gentle birdsong touches in the opening & closing nature moments
addSoftBirdCall(1.2, 2450, 0.5, -0.4);
addSoftBirdCall(1.55, 2680, 0.45, -0.4);
addSoftBirdCall(3.4, 2200, 0.4, 0.45);
addSoftBirdCall(114.2, 2380, 0.45, 0.35);
addSoftBirdCall(114.6, 2590, 0.4, 0.35);

// 2. Musical Score: 8-beat bars at 66 BPM (1 beat = 0.909s, 1 bar of 4 beats = 3.636s)
// Total bars: 32 bars = 116.35s + 2.0s intro offset = 118.35s + reverb tail to 121s
const BEAT = 60 / 66; // ~0.90909s
const BAR = BEAT * 4; // ~3.63636s
const START_OFFSET = 2.0; // Piano enters gently at 0:02

interface BarSpec {
  pad: number[];
  arp: number[]; // 8 eighth-note broken chord pitches per bar
  melody: Array<{ beat: number; pitch: number; dur: number; vel: number }>;
}

// Expressive, lyrical chord & melody progression matching the uploaded piece
const progression: BarSpec[] = [
  // Cycle 1 (Bars 0-3): Tender opening motif in Bb major / Eb maj7 / Gm7 / Fadd9
  {
    pad: [N.Bb2, N.F3, N.Bb3, N.D4],
    arp: [N.Bb3, N.F4, N.Bb4, N.D5, N.F4, N.Bb4, N.D5, N.F4],
    melody: [
      { beat: 0, pitch: N.D5, dur: 1.8, vel: 0.72 },
      { beat: 2.0, pitch: N.C5, dur: 1.0, vel: 0.65 },
      { beat: 3.0, pitch: N.Bb4, dur: 1.2, vel: 0.68 },
    ],
  },
  {
    pad: [N.Eb3, N.Bb3, N.Eb4, N.G4],
    arp: [N.Eb3, N.Bb3, N.Eb4, N.G4, N.Bb4, N.G4, N.Eb4, N.Bb3],
    melody: [
      { beat: 0, pitch: N.G5, dur: 1.5, vel: 0.76 },
      { beat: 1.5, pitch: N.F5, dur: 1.0, vel: 0.70 },
      { beat: 2.5, pitch: N.D5, dur: 1.5, vel: 0.72 },
    ],
  },
  {
    pad: [N.G2, N.D3, N.G3, N.Bb3],
    arp: [N.G3, N.D4, N.G4, N.Bb4, N.D5, N.Bb4, N.G4, N.D4],
    melody: [
      { beat: 0, pitch: N.Bb5, dur: 1.5, vel: 0.80 },
      { beat: 1.5, pitch: N.A5, dur: 0.8, vel: 0.72 },
      { beat: 2.5, pitch: N.G5, dur: 0.8, vel: 0.70 },
      { beat: 3.25, pitch: N.F5, dur: 1.0, vel: 0.68 },
    ],
  },
  {
    pad: [N.F2, N.C3, N.F3, N.A3],
    arp: [N.F3, N.C4, N.F4, N.A4, N.C5, N.A4, N.F4, N.C4],
    melody: [
      { beat: 0, pitch: N.F5, dur: 2.0, vel: 0.75 },
      { beat: 2.0, pitch: N.Eb5, dur: 1.0, vel: 0.68 },
      { beat: 3.0, pitch: N.D5, dur: 1.2, vel: 0.66 },
    ],
  },
  // Cycle 2 (Bars 4-7): Flowing high-register response
  {
    pad: [N.Eb2, N.Bb2, N.G3, N.D4],
    arp: [N.Eb3, N.Bb3, N.G4, N.Bb4, N.D5, N.Bb4, N.G4, N.Bb3],
    melody: [
      { beat: 0, pitch: N.Eb5, dur: 1.5, vel: 0.76 },
      { beat: 1.5, pitch: N.F5, dur: 1.0, vel: 0.74 },
      { beat: 2.5, pitch: N.G5, dur: 1.5, vel: 0.78 },
    ],
  },
  {
    pad: [N.Bb2, N.F3, N.D4, N.F4],
    arp: [N.Bb2, N.F3, N.Bb3, N.D4, N.F4, N.D4, N.Bb3, N.F3],
    melody: [
      { beat: 0, pitch: N.F5, dur: 1.5, vel: 0.75 },
      { beat: 1.5, pitch: N.D5, dur: 1.0, vel: 0.70 },
      { beat: 2.5, pitch: N.Bb4, dur: 1.6, vel: 0.68 },
    ],
  },
  {
    pad: [N.C3, N.G3, N.Eb4, N.G4],
    arp: [N.C3, N.G3, N.C4, N.Eb4, N.G4, N.Eb4, N.C4, N.G3],
    melody: [
      { beat: 0, pitch: N.Eb5, dur: 1.5, vel: 0.74 },
      { beat: 1.5, pitch: N.D5, dur: 1.0, vel: 0.70 },
      { beat: 2.5, pitch: N.C5, dur: 1.5, vel: 0.68 },
    ],
  },
  {
    pad: [N.F2, N.C3, N.A3, N.F4],
    arp: [N.F3, N.C4, N.F4, N.G4, N.A4, N.G4, N.F4, N.C4],
    melody: [
      { beat: 0, pitch: N.D5, dur: 1.5, vel: 0.72 },
      { beat: 1.5, pitch: N.C5, dur: 2.5, vel: 0.70 },
    ],
  },
];

const totalBars = 31;
for (let bar = 0; bar < totalBars; bar++) {
  const barStartSec = START_OFFSET + bar * BAR;
  const spec = progression[bar % progression.length];
  const isIntro = bar < 2;
  const isMiddleSwell = bar >= 8 && bar < 22;
  const isOutro = bar >= 27;

  // Dynamic expression curve across the 2-minute journey
  const dynScale = isIntro ? 0.78 : isOutro ? Math.max(0.45, 1.0 - (bar - 26) * 0.13) : isMiddleSwell ? 1.05 : 0.92;

  // 1. Warm sustained string/synth pad
  addWarmPad(spec.pad, barStartSec, BAR * 1.08, 0.85 * dynScale);

  // 2. Deep warm piano bass root on Beat 0 (and gentle fifth on Beat 2)
  addPianoNote(spec.pad[0], barStartSec, BAR * 1.1, 0.56 * dynScale, -0.25);
  if (!isOutro || bar < 29) {
    addPianoNote(spec.pad[1], barStartSec + BEAT * 2, BAR * 0.6, 0.44 * dynScale, -0.15);
  }

  // 3. Flowing eighth-note broken chord piano arpeggios
  const eighthDur = BEAT * 0.5;
  for (let step = 0; step < 8; step++) {
    if (isOutro && bar === totalBars - 1 && step > 4) continue;
    const noteTime = barStartSec + step * eighthDur + (Math.random() * 0.008 - 0.004); // subtle human rubato
    const arpPitch = spec.arp[step % spec.arp.length];
    const stepAccent = step % 4 === 0 ? 0.52 : step % 2 === 0 ? 0.44 : 0.38;
    const pan = -0.2 + (step / 7) * 0.4;
    addPianoNote(arpPitch, noteTime, eighthDur * 2.8, stepAccent * dynScale, pan);
  }

  // 4. Lyrical upper-register piano melody (with delicate octave shimmer in the middle swell)
  for (const m of spec.melody) {
    const melTime = barStartSec + m.beat * BEAT + 0.012;
    addPianoNote(m.pitch, melTime, m.dur * BEAT * 1.4, m.vel * dynScale, 0.22);
    if (isMiddleSwell && m.beat === 0) {
      // Crystalline upper octave grace note
      addPianoNote(m.pitch * 2, melTime + 0.035, m.dur * BEAT * 1.2, m.vel * 0.42 * dynScale, 0.38);
    }
  }
}

// Final resolving shimmering BbMaj9 chord at ~114.7s fading gracefully into the forest stream
const finalChordSec = START_OFFSET + totalBars * BAR;
[N.Bb2, N.F3, N.D4, N.F4, N.A4, N.C5, N.D5, N.F5, N.Bb5].forEach((freq, idx) => {
  addPianoNote(freq, finalChordSec + idx * 0.075, 5.2, 0.55 - idx * 0.025, -0.3 + idx * 0.075);
});

// Lush Stereo Hall Reverb (multi-tap Schroeder/comb diffusion for warm concert felt piano)
const reverbTaps = [
  { delaySec: 0.073, gain: 0.24, cross: 0.1 },
  { delaySec: 0.137, gain: 0.19, cross: 0.25 },
  { delaySec: 0.229, gain: 0.14, cross: 0.35 },
  { delaySec: 0.353, gain: 0.10, cross: 0.45 },
  { delaySec: 0.509, gain: 0.07, cross: 0.5 },
];

for (const tap of reverbTaps) {
  const delaySamples = Math.floor(tap.delaySec * SAMPLE_RATE);
  for (let i = delaySamples; i < TOTAL_SAMPLES; i++) {
    const prevL = leftChannel[i - delaySamples];
    const prevR = rightChannel[i - delaySamples];
    leftChannel[i] += (prevL * (1 - tap.cross) + prevR * tap.cross) * tap.gain;
    rightChannel[i] += (prevR * (1 - tap.cross) + prevL * tap.cross) * tap.gain;
  }
}

// Normalize audio cleanly
let maxPeak = 0;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  maxPeak = Math.max(maxPeak, Math.abs(leftChannel[i]), Math.abs(rightChannel[i]));
}

const normFactor = maxPeak > 0 ? 0.88 / maxPeak : 1;
console.log(`Peak level: ${maxPeak.toFixed(3)}, normalization: ${normFactor.toFixed(3)}`);

const numChannels = 2;
const bytesPerSample = 2;
const blockAlign = numChannels * bytesPerSample;
const byteRate = SAMPLE_RATE * blockAlign;
const dataSize = TOTAL_SAMPLES * blockAlign;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);

buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(16, 34);

buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

let offset = 44;
for (let i = 0; i < TOTAL_SAMPLES; i++) {
  const l = Math.max(-1, Math.min(1, leftChannel[i] * normFactor));
  buffer.writeInt16LE(Math.floor(l * 32767), offset);
  offset += 2;

  const r = Math.max(-1, Math.min(1, rightChannel[i] * normFactor));
  buffer.writeInt16LE(Math.floor(r * 32767), offset);
  offset += 2;
}

const outDir = path.resolve('./public/audio');
const outPath = path.join(outDir, 'expedition_chill.wav');
fs.writeFileSync(outPath, buffer);
console.log(`Generated exclusive 02:01 serene piano & nature soundtrack at ${outPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
