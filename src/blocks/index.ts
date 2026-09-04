import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as Id from 'blockly/msg/id';
import { registerHtmlBlocks } from './html/blocks';
import { registerHtmlGenerator } from './html/generator';
import { registerSpriteBlocks } from './sprite/blocks';
import { registerSpriteGenerators } from './sprite/generator';
import { spriteTheme } from './theme';

export { Blockly, spriteTheme };
export { setHtmlAssetOptionsProvider } from './html/blocks';
export { generateHtml } from './html/generator';
export type { GeneratedHtml } from './html/generator';
export { htmlToolbox } from './html/toolbox';
export { setCostumeOptionsProvider } from './sprite/blocks';
export { generateThreads } from './sprite/generator';
export type { ThreadCode } from './sprite/generator';
export const BLOCKLY_LOCALE = 'id';

let spriteInstalled = false;
let htmlInstalled = false;

export function installSpriteBlockly(): void {
  if (spriteInstalled) return;
  Blockly.setLocale(Id as unknown as Record<string, string>);
  registerSpriteBlocks();
  registerSpriteGenerators();
  spriteInstalled = true;
}

export function installHtmlBlockly(): void {
  if (htmlInstalled) return;
  Blockly.setLocale(Id as unknown as Record<string, string>);
  registerHtmlBlocks();
  registerHtmlGenerator();
  htmlInstalled = true;
}
