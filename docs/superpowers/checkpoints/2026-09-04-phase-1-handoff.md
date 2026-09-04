# Checkpoint — 2026-09-04 — Kodako-HTML Phase 1 mid-review

Session paused near a usage limit. This file is the resume point for the next session.
Everything described as "committed" is safe in git; nothing important lives only in a
session.

## Where things are

| Thing | Location |
|---|---|
| GitHub repo | `https://github.com/Pratametheus/Kodako-HTML` — trunk branch **`main`** (there is no `master`) |
| Main worktree | `C:/Users/Predator/orca/projects/Game HTML` — on `main` |
| Feature worktree | `C:/Users/Predator/orca/workspaces/Game HTML/emperor` — on `phase-1-sprite-mode` (Orca-managed; leave it in place) |
| `main` HEAD | `802ddba` (Phase 0 merged as PR #1 + Phase 1 plan committed) — pushed |
| `phase-1-sprite-mode` HEAD | **`abacf5c`** — 16 commits ahead of `802ddba` — **pushed to origin as a backup** (no PR, no merge) |

## Phase 0 — DONE (merged)

PR #1 merged to `main`. Vite 6 + TS strict toolchain, `src/core/*` (project model, event bus,
`Storage`+`WebStorage`+`TauriStorage` behind `getStorage()`), `src/app/*` (i18n, hash router,
`ProjectManager`, Home view, Editor shell), static Indonesian landing page, Playwright E2E,
Tauri 2 scaffold (build deferred — no Rust toolchain), GitHub Actions CI.

## Phase 1 (Sprite Mode MVP) — CODE COMPLETE, REVIEW UNFINISHED

Plan: `docs/superpowers/plans/2026-09-04-phase-1-sprite-mode.md` (16 TDD tasks).
SDD ledger (rulings + progress + handback) in the emperor worktree, gitignored:
`.superpowers/sdd/2026-09-04-phase-1-sprite-mode/{progress.md,HANDBACK.md}`

### Execution history

- **Tasks 1–3** run by a Claude "Fase 1 SDD" agent (subagent-driven-development): scaffold
  Blockly@11.2.2 + js-interpreter@6.0.2 + minimal theme; pure `Sprite` model + Scratch coord
  math; 40+ block defs + categorized toolbox. Reviews clean. Then that agent was **stood down**
  (user switched executor to Codex).
- **Tasks 4–16** run by the **Codex** agent (`gpt-5.6-sol high`, "emperor" terminal tab) in the
  same worktree: ES5 generator, runtime context/api/interpreter/scheduler/event-bus, placeholder
  SVG assets, Canvas stage renderer, per-sprite workspace wiring, sprite-mode editor UI
  (Blockly + stage + sprite/costume panels), i18n, green-flag E2E, ROADMAP ticks.

### Coordinator verification done this session (independent of Codex's report)

Ran in the emperor worktree, ALL GREEN:
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm test` ✅ **131/131 across 27 files**
- `npm run build` ✅ (advisory only: editor chunk > 500 kB because Blockly is large — not a blocker)
- `npm run test:e2e` ✅ **3/3** (incl. new `tests/e2e/sprite-mode.spec.ts` green-flag flow)

Working tree clean.

### Rulings on record (honor these on resume)

Pre-flight (from Tasks 1–3 executor):
1. Real Project path is `project.sprite.sprites` / `project.sprite.stage.backdrop` (plan prose sometimes wrote `project.sprites`).
2. `createThreadInterpreter(code, api)` is 2-arg; highlight flows via `api.sync.highlightBlock` wired by `buildApi` to `hooks.onHighlight`.
3. Multi-sprite green-flag: live workspace for the active sprite + disposable headless `new Blockly.Workspace()` per other sprite.
4. Tasks 13–14 added needed `editor.sprite.*` i18n keys early; Task 15 audited/completed them.
5. Task 2's edge-bounce test assertion was corrected; `sprite.ts` not to be revisited.

Codex, Tasks 4–16:
6. (Task 4) Escape literal backticks in Blockly-generated block IDs as ES5 `\x60` in emitted source (Blockly 11 random IDs can contain backticks; plan asserts no backticks). Cost if wrong: highlight fails for affected IDs.
7. (Task 7) Arity-specific async native wrappers — JS-Interpreter 6.0.2 derives interpreted arg count from `Function.length`; a rest-arg wrapper has length 0 and crashes `new Array(-1)`. Cost if wrong: duration blocks crash on call.
8. (Task 8) Finite `ulangi N kali` fixture runs across 5 ticks, not 1 — `__yield__()` per iteration + yield = one-frame park. Cost if wrong: finite loops finish one frame late or violate cooperative scheduling.
9. (Task 16) E2E spec keeps the plan's untyped Blockly fixture with a file-scoped `no-explicit-any` disable. Cost if wrong: a type error hidden in that one E2E boundary.

### Coordinator's own review notes so far (NOT yet adjudicated)

- `tsconfig.json` gained `"vite/client"` in `types` — needed for `?url` SVG asset imports. Looks justified, minimal.
- `tests/unit/shell.test.ts` + `tests/unit/editor-view.test.ts` were changed to force `project.activeMode = 'html'` so they don't mount sprite mode (Blockly inject is heavy in jsdom). **Defensible** (their real purpose is routing / header, and the sprite-mode mount path is claimed covered by `tests/unit/sprite-mode-view.test.ts` (133 lines) + the E2E) — but it means **no unit test exercises `startApp` → editor → sprite (default) mode rendering**. Confirm `sprite-mode-view.test.ts` genuinely injects + asserts Blockly/stage/panels and isn't over-stubbed.
- `project.test.ts` updated to assert the new default `builtin:cat` costume + `assets['builtin:cat']` — this is required by plan Task 12, and asserts MORE, not less. Fine.
- Build chunk-size advisory (editor > 500 kB) — deferred; consider `manualChunks` for Blockly in Phase 3.

### DEEP REVIEW — INCOMPLETE

A foreman whole-branch review agent was dispatched this session (Sonnet) with the plan + ledger
+ full diff (`scratchpad/phase1.diff`, ~4157 insertions / 59 files) and a scrutiny checklist
(test quality across `tests/unit/sprite-*`, soundness of rulings 6–9, the two test
accommodations, `ulangi terus` non-freeze proof, Bahasa Indonesia coverage, scheduler/
event-bus/stage hand-trace, Fase 1 "Definisi selesai" coverage). **Its result did not arrive
before the session paused.** Re-run this review first thing on resume.

## NEXT SESSION — resume steps

1. `cd "C:/Users/Predator/orca/workspaces/Game HTML/emperor"` — confirm on `phase-1-sprite-mode` @ `abacf5c`, tree clean.
2. Re-run the full gate to reconfirm green: `npm run typecheck && npm run lint && npm test && npm run build && npm run test:e2e`.
3. Re-dispatch the **foreman whole-branch review** (see checklist above). Diff to give it: `git diff origin/main..HEAD`.
4. Read `.superpowers/sdd/2026-09-04-phase-1-sprite-mode/{progress.md,HANDBACK.md}` for the rulings + Codex's parked/deferred list.
5. Adjudicate + fix findings. Prefer sending targeted fixes to the Codex agent (terminal "emperor" in the emperor worktree, `orca terminal send`), coordinator does not hand-fix.
6. When clean: merge `phase-1-sprite-mode` → `main`.
   - Recommended flow (matches Phase 0): from the main worktree `C:/Users/Predator/orca/projects/Game HTML`, `git fetch`, `git push -u origin phase-1-sprite-mode`, `gh pr create --base main --head phase-1-sprite-mode`, then `git checkout main && git merge --ff-only phase-1-sprite-mode && git push origin main` (GitHub auto-marks the PR merged). End the PR body with the `🤖 Generated with Claude Code` line.
   - After merge: `git push origin --delete phase-1-sprite-mode`, keep the emperor worktree (Orca-managed).
7. Update `docs/superpowers/checkpoints/` or delete this file once Phase 1 is merged.
8. Then: Phase 2 (HTML mode) — brainstorm-light → plan → execute. Same split is fine (coordinator plans, an agent in the emperor worktree executes).

## Agents / terminals in play (session-local — informational only)

- Codex agent — "emperor" terminal tab, emperor worktree. Idle after writing HANDBACK. Reusable for fixes.
- Claude "Fase 1 SDD" agent — stood down; its Task-4 subagent was killed; worktree left clean. Can be closed.
- Two agents in ONE worktree is a git-collision risk — only run one at a time against `phase-1-sprite-mode`.

## Deferred to Phase 3 (from both plans' rulings + handback)

Tauri desktop build (needs Rust+MSVC; `npm run tauri icon` first — icons are placeholders);
Sound (`runtime/sprite/audio.ts` + Suara blocks); collision/mouse Sensor; full Scratch
renderer/theme; real CC0 art replacing placeholder SVGs; full broadcast-and-wait dependency
graph; 5 transitive `npm audit` vulns; `.gitattributes` already added; Blockly pinned at
11.2.2 until repo moves past jsdom 25; editor bundle > 500 kB (consider `manualChunks`).
