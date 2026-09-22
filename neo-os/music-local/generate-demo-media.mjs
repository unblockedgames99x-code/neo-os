/**
 * Rebuild the three original NEO demo compositions entirely offline:
 *   node neo-os/music-local/generate-demo-media.mjs
 *
 * All synthesis, melodies, percussion and covers are local; no samples are taken
 * from commercial recordings. These are intentionally short complete pieces,
 * clearly labelled as demos in the catalog, never 30-second preview fallbacks.
 * The PCM WAV output plays without codec/CDN libraries on Chrome and ChromeOS.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const outputDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'media');
const rate = 22050;
const tau = Math.PI * 2;
const compositions = [
  {
    id: 'after-hours', bpm: 80, seed: 91, character: 'soft',
    chords: [[48, 55, 60, 63], [44, 51, 56, 60], [51, 58, 63, 67], [46, 53, 58, 62]],
    melody: [12, 19, 15, 19, 24, 19, 15, 12]
  },
  {
    id: 'quiet-orbit', bpm: 72, seed: 307, character: 'ambient',
    chords: [[50, 57, 62, 65], [46, 53, 58, 62], [53, 60, 65, 69], [48, 55, 60, 64]],
    melody: [12, 24, 19, 15, 24, 19, 27, 24]
  },
  {
    id: 'morning-lines', bpm: 90, seed: 521, character: 'bright',
    chords: [[48, 55, 60, 64], [43, 50, 55, 59], [45, 52, 57, 60], [41, 48, 53, 57]],
    melody: [12, 16, 19, 24, 19, 16, 24, 28]
  }
];

function randomSource(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function addTone(buffer, start, length, midi, amplitude, kind = 'keys') {
  const begin = Math.max(0, Math.round(start * rate));
  const samples = Math.min(Math.round(length * rate), buffer.length - begin);
  const frequency = 440 * Math.pow(2, (midi - 69) / 12);
  const attack = kind === 'pad' ? 0.32 : 0.012;
  const release = kind === 'pad' ? Math.min(1.1, length / 2) : Math.min(0.18, length / 3);
  for (let i = 0; i < samples; i += 1) {
    const t = i / rate;
    const endEnvelope = Math.min(1, Math.max(0, (length - t) / release));
    const envelope = Math.min(1, t / attack) * endEnvelope;
    const phase = tau * frequency * t;
    let wave;
    if (kind === 'pad') {
      wave = Math.sin(phase) * 0.7 + Math.sin(phase * 1.0016) * 0.22 + Math.sin(phase * 2) * 0.08;
      wave *= 0.94 + Math.sin(tau * 0.17 * t) * 0.06;
    } else if (kind === 'bass') {
      wave = (Math.sin(phase) + 0.11 * Math.sin(phase * 2)) * Math.exp(-t * 1.4);
    } else {
      wave = (Math.sin(phase) + 0.23 * Math.sin(phase * 2) + 0.06 * Math.sin(phase * 3)) * Math.exp(-t * 2.7);
    }
    buffer[begin + i] += wave * envelope * amplitude;
  }
}

function addDrum(buffer, at, kind, amplitude, random) {
  const begin = Math.round(at * rate);
  const length = kind === 'kick' ? 0.28 : kind === 'snare' ? 0.15 : 0.042;
  const samples = Math.min(Math.round(length * rate), buffer.length - begin);
  let lastNoise = 0;
  let phase = 0;
  for (let i = 0; i < samples; i += 1) {
    const t = i / rate;
    const noise = random() * 2 - 1;
    let wave;
    if (kind === 'kick') {
      phase += tau * (44 + 83 * Math.exp(-t * 32)) / rate;
      wave = Math.sin(phase) * Math.exp(-t * 16);
    } else if (kind === 'snare') {
      wave = ((noise - lastNoise) * 0.42 + Math.sin(tau * 172 * t) * 0.2) * Math.exp(-t * 30);
    } else {
      wave = (noise - lastNoise) * Math.exp(-t * 95) * 0.55;
    }
    lastNoise = noise;
    buffer[begin + i] += wave * amplitude * Math.min(1, t / 0.002);
  }
}

function compose(config) {
  const beat = 60 / config.bpm;
  const bars = 24;
  const duration = bars * beat * 4;
  const buffer = new Float32Array(Math.round(duration * rate));
  const random = randomSource(config.seed);
  for (let bar = 0; bar < bars; bar += 1) {
    const chord = config.chords[Math.floor(bar / 2) % config.chords.length];
    const start = bar * beat * 4;
    const outro = bar >= 22;
    const arrangement = bar < 2 || outro ? 0.68 : 1;
    for (const note of chord) {
      addTone(buffer, start, beat * 4.7, note, 0.083 * arrangement, 'pad');
    }
    if (bar >= 2 && !outro) {
      addTone(buffer, start, beat * 1.8, chord[0] - 12, 0.20, 'bass');
      addTone(buffer, start + beat * 2.5, beat, chord[0] - 12, 0.14, 'bass');
    }
    const steps = config.character === 'ambient' ? 4 : 8;
    for (let step = 0; step < steps; step += 1) {
      const note = chord[step % chord.length] + 12;
      const at = start + step * beat * 4 / steps;
      addTone(buffer, at, beat * 1.8, note, (outro ? 0.055 : 0.11), 'keys');
      addTone(buffer, at + beat * 0.75, beat * 1.8, note, 0.022, 'keys');
    }
    if (bar >= 4 && bar < 22 && bar % 2 === 0) {
      for (let step = 0; step < 4; step += 1) {
        const note = chord[0] + config.melody[(bar + step) % config.melody.length];
        addTone(buffer, start + (step + 0.5) * beat, beat * 1.5, note, 0.10, 'keys');
      }
    }
    if (config.character !== 'ambient' && bar >= 2 && !outro) {
      for (let step = 0; step < 8; step += 1) {
        addDrum(buffer, start + step * beat / 2, 'hat', step % 2 ? 0.026 : 0.04, random);
      }
      addDrum(buffer, start, 'kick', 0.25, random);
      addDrum(buffer, start + beat * 2, 'kick', 0.20, random);
      addDrum(buffer, start + beat, 'snare', 0.078, random);
      addDrum(buffer, start + beat * 3, 'snare', 0.065, random);
    }
  }
  let peak = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const t = i / rate;
    buffer[i] *= Math.min(1, t / 0.75, (duration - t) / 3.2);
    peak = Math.max(peak, Math.abs(buffer[i]));
  }
  const gain = peak > 0 ? 0.86 / peak : 1;
  let power = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    buffer[i] *= gain;
    power += buffer[i] * buffer[i];
  }
  return { buffer, duration, rms: Math.sqrt(power / buffer.length) };
}

function wav(samples) {
  const audio = Buffer.alloc(44 + samples.length * 2);
  audio.write('RIFF', 0);
  audio.writeUInt32LE(audio.length - 8, 4);
  audio.write('WAVEfmt ', 8);
  audio.writeUInt32LE(16, 16);
  audio.writeUInt16LE(1, 20); // Uncompressed PCM.
  audio.writeUInt16LE(1, 22); // Mono keeps local downloads small.
  audio.writeUInt32LE(rate, 24);
  audio.writeUInt32LE(rate * 2, 28);
  audio.writeUInt16LE(2, 32);
  audio.writeUInt16LE(16, 34);
  audio.write('data', 36);
  audio.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i += 1) {
    audio.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  return audio;
}

await mkdir(outputDir, { recursive: true });
for (const config of compositions) {
  const track = compose(config);
  const file = wav(track.buffer);
  await writeFile(path.join(outputDir, `${config.id}.wav`), file);
  console.log(`${config.id}: ${track.duration}s, ${(file.length / 1024 / 1024).toFixed(2)} MiB, RMS ${track.rms.toFixed(3)}, peak 0.86`);
}
