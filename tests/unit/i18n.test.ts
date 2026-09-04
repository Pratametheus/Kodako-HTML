import { describe, expect, it } from 'vitest';
import { formatDate, t } from '../../src/app/i18n';
import dict from '../../src/app/i18n/id.json';

describe('t', () => {
  it('returns the Indonesian string for a known key', () => {
    expect(t('home.new')).toBe('Project Baru');
  });
  it('substitutes named params', () => {
    expect(t('confirm.delete', { name: 'Latihan 1' })).toContain('Latihan 1');
  });
  it('returns the key itself when missing', () => {
    expect(t('nope.missing.key')).toBe('nope.missing.key');
  });
  it('contains complete Bahasa Indonesia strings for sprite mode', () => {
    expect(t('editor.sprite.run')).toBe('Jalankan');
    expect(t('editor.sprite.stop')).toBe('Berhenti');
    expect(t('editor.sprite.uploadTooBig')).toContain('2 MB');
    const obviousEnglish = ['Run ', 'Stop', 'Costume', 'Upload', 'Delete', 'Backdrop'];
    for (const value of Object.values(dict)) {
      for (const word of obviousEnglish) expect(value).not.toContain(word);
    }
  });
  it('contains complete Bahasa Indonesia strings for HTML mode', () => {
    expect(t('editor.html.tabCode')).toBe('Lihat Kode');
    expect(t('editor.html.uploadTooBig')).toContain('2 MB');
    const obviousEnglish = [
      'Preview',
      'View Code',
      'Upload',
      'Export',
      'Image too large',
      'File is not an image',
    ];
    for (const value of Object.values(dict)) {
      for (const phrase of obviousEnglish) expect(value).not.toContain(phrase);
    }
  });
});

describe('formatDate', () => {
  it('formats an ISO string in id-ID and includes the year', () => {
    const out = formatDate('2026-09-03T10:00:00.000Z');
    expect(out).toMatch(/2026/);
  });
});
