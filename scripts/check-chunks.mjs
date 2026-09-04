// Verifies the production build's chunk split after `npm run build`:
//   - Blockly (the largest dependency) is pre-split into its own vendor chunk
//     instead of inflating the `editor` entry chunk.
//   - The `editor` entry chunk itself stays under the perf budget from the
//     Fase 3b plan (PRD §7 "loads fast on a school laptop" proxy).
//   - `dist/index.html` and `dist/landing.html` are both still emitted.
//
// Run after `npm run build` (see Task 11 in
// docs/superpowers/plans/2026-09-04-phase-3b-polish.md — a full spawn-build
// vitest test was judged too slow/flaky for the unit suite, so this plain
// script is invoked directly as part of the Task 11 gate instead).
import console from 'node:console';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const assetsDir = resolve(distDir, 'assets');
const EDITOR_ENTRY_LIMIT_BYTES = 400 * 1024;

function fail(message) {
  console.error(`[check-chunks] FAIL: ${message}`);
  process.exitCode = 1;
}

if (!existsSync(distDir)) {
  fail(`dist/ not found at ${distDir} — run "npm run build" first.`);
  process.exit(process.exitCode);
}

for (const page of ['index.html', 'landing.html']) {
  if (!existsSync(resolve(distDir, page))) fail(`dist/${page} is missing.`);
}

if (!existsSync(assetsDir)) {
  fail(`dist/assets/ not found — build did not produce chunked output.`);
  process.exit(process.exitCode ?? 0);
}

const files = readdirSync(assetsDir);
const vendorBlockly = files.filter((f) => /^vendor-blockly-.*\.js$/.test(f));
const editorEntry = files.filter((f) => /^editor-.*\.js$/.test(f));

if (vendorBlockly.length === 0) {
  fail('no vendor-blockly-*.js chunk found — Blockly was not split out.');
} else {
  const size = statSync(resolve(assetsDir, vendorBlockly[0])).size;
  console.log(`[check-chunks] vendor-blockly chunk: ${(size / 1024).toFixed(1)} kB`);
}

if (editorEntry.length === 0) {
  fail('no editor-*.js entry chunk found.');
} else {
  const size = statSync(resolve(assetsDir, editorEntry[0])).size;
  console.log(`[check-chunks] editor entry chunk: ${(size / 1024).toFixed(1)} kB`);
  if (size >= EDITOR_ENTRY_LIMIT_BYTES) {
    fail(
      `editor entry chunk is ${(size / 1024).toFixed(1)} kB, must be < ${EDITOR_ENTRY_LIMIT_BYTES / 1024} kB.`,
    );
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log('[check-chunks] OK');
