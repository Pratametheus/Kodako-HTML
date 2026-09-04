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
    expect(t('editor.sprite.tabSound')).toBe('Suara');
    expect(t('editor.sprite.askPlaceholder')).toContain('jawabanmu');
    expect(t('editor.sprite.askSubmit')).toBe('Kirim');
    expect(t('editor.sprite.uploadSoundTooBig')).toContain('2 MB');
    expect(t('editor.sprite.uploadNotAudio')).toContain('bukan suara');
    expect(t('error.audioUnavailable')).toContain('tidak didukung');
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

  it('contains exact Bahasa Indonesia strings for the error boundary, toast, and a11y labels', () => {
    expect(t('boundary.title')).toBe('Maaf, ada yang salah');
    expect(t('boundary.body')).toBe(
      'Pekerjaanmu yang terakhir sudah tersimpan. Coba muat ulang halaman.',
    );
    expect(t('boundary.reload')).toBe('Muat ulang');
    expect(t('boundary.copy')).toBe('Salin detail');
    expect(t('toast.close')).toBe('Tutup pesan');
    expect(t('editor.sprite.stageLabel')).toBe('Panggung tempat sprite bergerak');
    expect(t('a11y.modeTablist')).toBe('Pilih mode editor');
    expect(t('a11y.previewTablist')).toBe('Pratinjau atau kode');

    const obviousEnglish = ['Reload', 'Copy', 'Close'];
    for (const value of Object.values(dict)) {
      for (const word of obviousEnglish) expect(value).not.toContain(word);
    }
  });
});

describe('formatDate', () => {
  it('formats an ISO string in id-ID and includes the year', () => {
    const out = formatDate('2026-09-03T10:00:00.000Z');
    expect(out).toMatch(/2026/);
  });
});
