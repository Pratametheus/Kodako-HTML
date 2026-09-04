import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const SOUND_NAMES = ['pop', 'beep', 'boing', 'meong', 'drum', 'chime', 'whoosh', 'koin'];
const scriptPath = resolve(process.cwd(), 'scripts/gen-sounds.mjs');
const committedDir = resolve(process.cwd(), 'src/runtime/sprite/assets/sounds');

describe('generated sound assets', () => {
  it('regenerates eight small valid WAV files byte-identically', async () => {
    const generatedDir = await mkdtemp(join(tmpdir(), 'kodako-sounds-'));
    try {
      const result = spawnSync(process.execPath, [scriptPath, generatedDir], {
        encoding: 'utf8',
      });
      expect(result.status, result.stderr).toBe(0);

      for (const name of SOUND_NAMES) {
        const committed = await readFile(join(committedDir, `${name}.wav`));
        const generated = await readFile(join(generatedDir, `${name}.wav`));
        expect(committed.toString('ascii', 0, 4)).toBe('RIFF');
        expect(committed.toString('ascii', 8, 12)).toBe('WAVE');
        expect(committed.byteLength).toBeLessThan(30_720);
        expect(generated).toEqual(committed);
      }
    } finally {
      await rm(generatedDir, { recursive: true, force: true });
    }
  });
});
