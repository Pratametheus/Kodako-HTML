import { describe, expect, it } from 'vitest';
import { formatDate, t } from '../../src/app/i18n';

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
});

describe('formatDate', () => {
  it('formats an ISO string in id-ID and includes the year', () => {
    const out = formatDate('2026-09-03T10:00:00.000Z');
    expect(out).toMatch(/2026/);
  });
});
