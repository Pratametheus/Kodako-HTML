import { describe, expect, it } from 'vitest';
import { Blockly, generateHtml, installBlockly } from '../../src/blocks';
import { STARTER_TEMPLATES } from '../../src/app/home/starter-templates';

installBlockly();

describe('starter templates', () => {
  it('provides at least 3 distinct starter templates', () => {
    expect(STARTER_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    const ids = STARTER_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(STARTER_TEMPLATES)('template "$name" loads in Blockly and generates HTML', (template) => {
    const ws = new Blockly.Workspace();
    expect(() => {
      Blockly.serialization.workspaces.load(template.workspace, ws);
    }).not.toThrow();

    const { headHtml, bodyHtml } = generateHtml(ws);
    expect(headHtml).toContain('<title>');
    expect(bodyHtml.length).toBeGreaterThan(50);
    ws.dispose();
  });
});
