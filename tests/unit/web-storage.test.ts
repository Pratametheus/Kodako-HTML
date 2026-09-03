import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProject, serializeProject } from '../../src/core/project';
import { STORAGE_KEYS, WebStorage } from '../../src/core/web-storage';

beforeEach(() => localStorage.clear());

describe('WebStorage list/save/load/delete', () => {
  it('returns an empty list when nothing is stored', async () => {
    expect(await new WebStorage().listProjects()).toEqual([]);
  });

  it('saves a project and lists its summary', async () => {
    const s = new WebStorage();
    const p = createEmptyProject('Latihan');
    await s.saveProject('p1', p, null);
    const list = await s.listProjects();
    expect(list).toEqual([
      { id: 'p1', name: 'Latihan', updatedAt: p.meta.updatedAt, thumbnailDataUrl: null },
    ]);
  });

  it('round-trips a saved project through loadProject', async () => {
    const s = new WebStorage();
    const p = createEmptyProject('Latihan');
    await s.saveProject('p1', p, null);
    const loaded = await s.loadProject('p1');
    expect(loaded).toEqual(p);
  });

  it('clears the tmp slot after a successful save', async () => {
    const s = new WebStorage();
    await s.saveProject('p1', createEmptyProject('X'), null);
    expect(localStorage.getItem(STORAGE_KEYS.tmp('p1'))).toBeNull();
  });

  it('recovers a project from the :tmp slot when the real key is missing (crash mid-save)', async () => {
    const s = new WebStorage();
    const p = createEmptyProject('Pulih');
    localStorage.setItem(STORAGE_KEYS.tmp('p1'), serializeProject(p));
    // No real key written yet — simulating a crash between the tmp write and the real write.
    expect(localStorage.getItem(STORAGE_KEYS.project('p1'))).toBeNull();
    const loaded = await s.loadProject('p1');
    expect(loaded).toEqual(p);
  });

  it('falls back to the :tmp slot when the real key is present but corrupt', async () => {
    const s = new WebStorage();
    const p = createEmptyProject('Pulih Rusak');
    localStorage.setItem(STORAGE_KEYS.project('p1'), '{ broken');
    localStorage.setItem(STORAGE_KEYS.tmp('p1'), serializeProject(p));
    const loaded = await s.loadProject('p1');
    expect(loaded).toEqual(p);
  });

  it('rejects loadProject for a missing id', async () => {
    await expect(new WebStorage().loadProject('nope')).rejects.toThrow(/tidak ditemukan/i);
  });

  it('rejects loadProject when the stored JSON is corrupt', async () => {
    localStorage.setItem(STORAGE_KEYS.project('bad'), '{ broken');
    await expect(new WebStorage().loadProject('bad')).rejects.toThrow();
  });

  it('does not overwrite the existing project if the new data fails to re-parse', async () => {
    const s = new WebStorage();
    const good = createEmptyProject('Good');
    await s.saveProject('p1', good, null);
    // A project whose JSON cannot round-trip is rejected before the real key is touched.
    const circular = createEmptyProject('Bad') as unknown as Record<string, unknown>;
    circular.self = circular;
    await expect(s.saveProject('p1', circular as never, null)).rejects.toThrow();
    expect(localStorage.getItem(STORAGE_KEYS.project('p1'))).toBe(serializeProject(good));
  });

  it('removes a project and its list entry on delete', async () => {
    const s = new WebStorage();
    await s.saveProject('p1', createEmptyProject('X'), null);
    await s.deleteProject('p1');
    expect(await s.listProjects()).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEYS.project('p1'))).toBeNull();
  });

  it('updates the list entry (not duplicates it) when saving the same id twice', async () => {
    const s = new WebStorage();
    await s.saveProject('p1', createEmptyProject('First'), null);
    const second = createEmptyProject('Second');
    await s.saveProject('p1', second, null);
    const list = await s.listProjects();
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe('Second');
  });
});

describe('WebStorage.importFromFile picker settle-guard', () => {
  it('rejects with the Bahasa Indonesia cancel message on a fileless change + window focus, and settles only once', async () => {
    const s = new WebStorage();
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    const outcome = s.importFromFile().then(
      () => 'resolved',
      (err: Error) => err.message,
    );
    const input = clickSpy.mock.contexts[0] as HTMLInputElement;

    input.dispatchEvent(new Event('change')); // no file chosen -> first settle
    // Dialog dismissed, window regains focus. Must not throw "already settled".
    expect(() => window.dispatchEvent(new Event('focus'))).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(await outcome).toBe('Tidak ada file yang dipilih.');
    clickSpy.mockRestore();
  });

  it('still resolves with the parsed project on the happy path, and a later stray focus cannot flip it to a rejection', async () => {
    const s = new WebStorage();
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

    const p = createEmptyProject('Dari File');
    const promise = s.importFromFile();
    const input = clickSpy.mock.contexts[0] as HTMLInputElement;
    const text = serializeProject(p);
    const fakeFile = { text: () => Promise.resolve(text) } as unknown as File;
    Object.defineProperty(input, 'files', { value: [fakeFile], configurable: true });
    input.dispatchEvent(new Event('change'));
    // A stray focus after a successful pick must not flip the resolved promise.
    window.dispatchEvent(new Event('focus'));
    await new Promise((r) => setTimeout(r, 0));

    expect(await promise).toEqual(p);
    clickSpy.mockRestore();
  });
});
