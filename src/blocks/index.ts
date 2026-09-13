import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import * as Id from 'blockly/msg/id';
import { registerKodakoFlyout } from './flyout';
import { registerHtmlBlocks } from './html/blocks';
import { registerHtmlGenerator } from './html/generator';
import { blocklyTheme } from './theme';

export { Blockly, blocklyTheme };
export { attachToolboxWash } from './toolbox-wash';
export { KodakoVerticalFlyout } from './flyout';
export { setHtmlAssetOptionsProvider } from './html/blocks';
export { generateHtml } from './html/generator';
export type { GeneratedHtml } from './html/generator';
export { htmlToolbox } from './html/toolbox';
export const BLOCKLY_LOCALE = 'id';

let installed = false;

export function installBlockly(): void {
  if (installed) return;
  registerKodakoFlyout();
  Blockly.setLocale(Id as unknown as Record<string, string>);
  registerHtmlBlocks();
  registerHtmlGenerator();
  installed = true;
}
