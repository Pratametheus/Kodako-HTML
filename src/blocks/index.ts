import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as Id from 'blockly/msg/id';
import { registerSpriteBlocks } from './sprite/blocks';
import { registerSpriteGenerators } from './sprite/generator';
import { spriteTheme } from './theme';

export { Blockly, spriteTheme };
export { setCostumeOptionsProvider } from './sprite/blocks';
export { generateThreads } from './sprite/generator';
export type { ThreadCode } from './sprite/generator';
export const BLOCKLY_LOCALE = 'id';

let installed = false;

export function installSpriteBlockly(): void {
  if (installed) return;
  Blockly.setLocale(Id as unknown as Record<string, string>);
  registerSpriteBlocks();
  registerSpriteGenerators();
  installed = true;
}
