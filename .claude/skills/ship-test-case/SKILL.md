---
name: ship-test-case
description: "Orchestrate one test case end to end: author it and push to Zephyr (/add-test-case), implement it as a Playwright spec (/add-test-from-zephyr), then open a PR (/git-pr) — pausing for confirmation before each write. Use when asked to create and automate a test case and ship it, or to run the full author-to-PR pipeline for one case."
user-invocable: true
---

# Ship Test Case

Run one test case through the whole pipeline — authored, pushed to Zephyr, automated as a
Playwright spec, and opened as a PR — by delegating to the three skills that already own each
concern. This skill does not reimplement any of their logic. It sequences them, carries the
identifiers each phase produces into the next, and stops the moment any phase reports a
blocker instead of pushing through it.

Per `CLAUDE.md` §1/§5, authoring, pushing and automation are deliberately separate concerns in
this repo (the push agents don't even carry a `Write`/`Edit` tool). This skill exists for
convenience of invocation, not to blur that boundary — each phase below is a literal
`Run /skill-name ...` delegation, the same idiom `add-test-from-zephyr` already uses for
`/add-page-object` and `/add-page-assertion`.

**One case per invocation.** If asked to ship several cases, run this whole pipeline once per
case rather than batching — don't interleave phases across cases.

## Phase 1 — Author and push

Run `/add-test-case` with the module and case details exactly as given to this skill.

- Let it run its own internal checkpoints (author the JSON, then plan-before-apply for the
  Zephyr MCP push) — don't duplicate or shortcut that logic here.
- **If it reports a blocker** — no Jira issue for the module, an unresolved `⚠ VERIFY` on a
  case that would need `Approved`, the Zephyr MCP unreachable, a priority/status the project
  doesn't have, an id collision, or anything else it stops on — **stop the whole pipeline
  here.** Report exactly what it reported. Do not attempt Phase 2 against a case that isn't
  actually live in Zephyr with a key; there is nothing for `add-test-from-zephyr` to fetch.
- On success, note the stable id (e.g. `CAT-TC-01`) and the Zephyr key it was created or
  updated as (e.g. `KAN-T24`).
- **Pause here.** Show the id, the Zephyr key, and whether the case carries any `⚠ VERIFY`
  markers on assertable steps (Phase 2 will have to `test.fixme()` those). Continue to Phase 2
  only on explicit confirmation.

## Phase 2 — Automate

Run `/add-test-from-zephyr` with the Zephyr key from Phase 1.

- It handles its own delegation to `/add-page-object` / `/add-page-assertion` for anything the
  steps need but don't have yet, and runs the finished spec itself
  (`npx playwright test <path> --config playwright/playwright.config.js`, per its own Step 5 —
  the same command `package.json` uses ad hoc for a single new spec; there's no per-file npm
  script, and the suite runs single-worker regardless of CI per
  `playwright/playwright.config.js`).
- A step `test.fixme()`'d because of an unresolved `⚠ VERIFY` is an **expected outcome**, not a
  pipeline failure (`CLAUDE.md` §3) — don't stop the pipeline for it, but don't hide it either.
- **If the spec can't be made to run at all**, or `add-test-from-zephyr` reports that Zephyr's
  case disagrees with the app in a way it can't resolve (its own "report it, don't invent"
  rule) — **stop the pipeline.** Don't carry a broken or silently-patched spec into Phase 3.
- **Pause here.** Show the run result (pass, or which steps are `fixme`'d and why) and the list
  of files it created or touched (the spec, plus any new page object / action / assertion
  files). Continue to Phase 3 only on explicit confirmation.

## Phase 3 — Ship

Run `/git-pr`, but hand it an **explicit, closed list of paths** — never let it discover scope
on its own:

- The changed entry in `testcases/{module}.json`.
- The new spec file under `playwright/tests/<domain>/`.
- Any new page object / action / assertion files Phase 2 created.

This matters concretely, not just in theory: this repo's working tree routinely carries
pre-existing, unrelated pending changes from other in-progress work (check `git status` before
handing off — don't assume it's clean). `git-pr` already refuses `git add -A`/`.` and requires
explicit paths, and `CLAUDE.md` §7 requires commits scoped to one concern — so the explicit
path list from Phases 1–2 is what keeps someone else's unrelated modified/untracked files out
of this PR. State the path list to `git-pr` up front rather than letting it re-derive scope
from a `git status` that includes things this pipeline didn't touch.

- One commit for the whole case — JSON entry, spec, and any new page/action/assertion files
  together, as one concern ("implement `<ID>` end to end"). Don't split into three commits for
  one test case.
- **Pause here** before running it — this is the only checkpoint before the actual push and PR
  happen, since `git-pr` itself treats being invoked as the explicit go-ahead and has no
  confirmation gate of its own. Show the exact path list and the planned commit message; run
  `/git-pr` only on explicit confirmation.

## Rules

- Pure orchestrator: never write JSON, a spec, a page object, or a git command yourself here —
  always go through `/add-test-case`, `/add-test-from-zephyr`, `/git-pr`.
- Three confirmation gates, one before each phase's write — never collapse or skip one, even if
  asked to go faster; report the request conflicts with this skill's design and confirm the
  user still wants that before dropping a gate.
- Any blocker reported by a phase ends the run at that phase. Never paper over a blocker, an
  unresolved `⚠ VERIFY`, or a failed spec run to keep the pipeline moving.
- Phase 3's path list is always explicit and closed — built from what Phases 1–2 actually
  produced, never from an unfiltered `git status`.
