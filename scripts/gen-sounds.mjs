import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const SOUND_NAMES = ['pop', 'beep', 'boing', 'meong', 'drum', 'chime', 'whoosh', 'koin'];

const RATE = 22_050;
const TAU = Math.PI * 2;

function envelope(time, duration, attack = 0.01, release = 0.08) {
  const fadeIn = Math.min(1, time / attack);
  const fadeOut = Math.min(1, (duration - time) / release);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function tone(duration, sampleAt) {
  const samples = new Float32Array(Math.floor(duration * RATE));
  for (let index = 0; index < samples.length; index += 1) {
    const time = index / RATE;
    samples[index] = sampleAt(time, duration) * envelope(time, duration);
  }
  return samples;
}

function glidePhase(time, startHz, endHz, duration) {
  const slope = (endHz - startHz) / duration;
  return TAU * (startHz * time + (slope * time * time) / 2);
}

function seededNoise(seed = 0x4b4f4441) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

const recipes = {
  pop: () => tone(0.14, (time, duration) => Math.sin(glidePhase(time, 920, 180, duration)) * 0.8),
  beep: () => tone(0.2, (time) => (Math.sin(TAU * 660 * time) >= 0 ? 0.42 : -0.42)),
  boing: () =>
    tone(0.42, (time, duration) => {
      const wobble = 1 + 0.18 * Math.sin(TAU * 11 * time);
      return Math.sin(glidePhase(time, 260, 95, duration)) * wobble * 0.62;
    }),
  meong: () =>
    tone(0.5, (time) => {
      if (time < 0.25) return Math.sin(glidePhase(time, 720, 410, 0.25)) * 0.55;
      return Math.sin(glidePhase(time - 0.25, 590, 300, 0.25)) * 0.55;
    }),
  drum: () => {
    const noise = seededNoise();
    return tone(0.24, (time) => {
      const decay = Math.exp(-18 * time);
      return (noise() * 0.72 + Math.sin(TAU * 85 * time) * 0.45) * decay;
    });
  },
  chime: () =>
    tone(0.5, (time) => {
      const decay = Math.exp(-4.5 * time);
      return (Math.sin(TAU * 880 * time) * 0.42 + Math.sin(TAU * 1320 * time) * 0.25) * decay;
    }),
  whoosh: () => {
    const noise = seededNoise(0x574f4f53);
    return tone(0.4, (time, duration) => {
      const swell = Math.sin((Math.PI * time) / duration);
      return noise() * swell * 0.48;
    });
  },
  koin: () =>
    tone(0.28, (time) => {
      if (time < 0.11) return Math.sin(TAU * 880 * time) * 0.55;
      if (time < 0.14) return 0;
      return Math.sin(TAU * 1320 * (time - 0.14)) * 0.55;
    }),
};

function encodeWav(samples, rate) {
  const dataBytes = samples.length * 2;
  const wav = Buffer.alloc(44 + dataBytes);
  wav.write('RIFF', 0, 'ascii');
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write('WAVE', 8, 'ascii');
  wav.write('fmt ', 12, 'ascii');
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36, 'ascii');
  wav.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    wav.writeInt16LE(Math.round(sample < 0 ? sample * 32_768 : sample * 32_767), 44 + index * 2);
  }
  return wav;
}

export function renderWav(name, rate = RATE) {
  const recipe = recipes[name];
  if (!recipe) throw new Error(`Unknown sound: ${name}`);
  return encodeWav(recipe(), rate);
}

export async function writeWav(path, samples, rate = RATE) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, encodeWav(samples, rate));
}

async function main() {
  const defaultDir = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../src/runtime/sprite/assets/sounds',
  );
  const outputDir = resolve(process.argv[2] ?? defaultDir);
  await mkdir(outputDir, { recursive: true });
  for (const name of SOUND_NAMES) {
    const recipe = recipes[name];
    if (!recipe) throw new Error(`Unknown sound: ${name}`);
    await writeWav(resolve(outputDir, `${name}.wav`), recipe());
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
