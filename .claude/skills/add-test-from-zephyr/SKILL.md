---
name: add-test-from-zephyr
description: "Implement a Playwright spec from a Zephyr test case link: one test.step per Zephyr step, asserting each expected result (skipping any marked '-'), scaffolding any page object, action, or assertion the steps need but don't have yet. Use when handed a Zephyr/Jira link to automate."
user-invocable: true
---

# Add Test From Zephyr

Turn one Zephyr test case into one Playwright spec. This is the orchestrator for the
automation workstream described in `CLAUDE.md` §1: **the automation suite is driven by
Zephyr links, not by `testcases/*.json`.** Zephyr is the source of truth for what the test
does; this skill's job is to make the spec match it exactly, and to say so — not silently
patch a gap — when it can't.

## Steps

### 1. Resolve the Zephyr key and fetch the case

- Extract the Zephyr key (pattern `[A-Z]+-T\d+`, e.g. `KAN-T16`) from the given link or text.
  If none is found, ask for the bare key rather than guessing which case is meant.
- Fetch the case with `mcp__zephyr__zephyr_get_test_case` (name, objective, precondition,
  priority, status, labels, folder) and its ordered steps with
  `mcp__zephyr__zephyr_get_test_case_steps` (`description`, `testData`, `expectedResult` per
  step). Optionally `mcp__zephyr__zephyr_get_test_case_links` for the linked Jira issue, for
  context on the business rule(s) the case is meant to cover.
- If a step's `expectedResult` carries a `⚠ VERIFY` marker, do not resolve or reword it —
  carry it through unchanged to step 5.
- If the case itself is ambiguous, missing an expected result outright, or a step doesn't say
  enough to automate (`CLAUDE.md` §1) — **report it and stop for that step**; do not invent
  the missing half. This applies per-step, not to the whole case: implement everything that is
  resolvable and call out only what isn't.

### 2. Place the spec and pick the actor

- Map the case's Zephyr folder to a `playwright/tests/<domain>/` subfolder, following the
  existing `search` / `checkout` naming (lowercase, one word per domain). Ask if the mapping
  isn't obvious for a new domain.
- Filename: `<key-lowercase>-<slug-of-name>.spec.js` (e.g. `kan-t16-select-item-and-checkout.spec.js`
  — match the existing files' pattern exactly).
- Test title: `` test('<KEY> <case name>', async ({ <actor> }) => { ... }) `` — the Zephyr key
  plus the case's own name, verbatim. This is the pairing that makes a failure traceable back
  to Zephyr without a separate mapping table.
- Actor: `regularUser` by default. Use `secondUser` if this case places an order and another
  order-placing spec already uses `regularUser` (`CLAUDE.md` §6 — two such specs must never
  share a cart in parallel). Use `guest` only if the case is explicitly a guest-checkout case.
- **Check for an existing spec carrying this key first.** If one exists, this is an update:
  read it, diff its steps against what Zephyr now says, and change only what changed — don't
  create a duplicate file for the same key.

### 3. Walk the Zephyr steps, one `test.step` each

For every step, in order:

1. Read `description` (the action) and `testData` (its inputs).
2. Find what page/component it operates on. If that isn't obvious from the wording alone,
   inspect the running app for it — navigate with the Playwright MCP browser tools
   (`mcp__playwright__browser_navigate` + `browser_snapshot`) already wired into `.mcp.json`.
   Never guess a locator, message, or control name that hasn't been observed.
3. **Check what already exists before writing anything new:**
   - An actor action already doing this? Reuse it (`playwright/src/actions/CustomerActions.js`).
   - A page object with the locator/atomic method this needs? Reuse it
     (`playwright/src/pages/`).
   - Neither exists? Run `/add-page-object` for the page/action pair the step needs, then
     come back and use what it created. Don't hand-roll a page object or action inline here —
     that skill owns the conventions (locator selection, `receipts`, atomic-vs-composed
     boundary) and duplicating them risks drift.
4. Write the step body: `await test.step('<description>', async () => { ...action calls... })`.

### 4. Assert the expected result — unless it's `-`

Immediately after a step's action(s), inside the same `test.step`:

- **If `expectedResult` is `-` (or blank)**: assert nothing. The step exists to perform an
  action, not to check state — leave the `test.step` body as the action call alone.
- **If `expectedResult` carries a `⚠ VERIFY` marker**: do not write an assertion against it.
  Per `CLAUDE.md` §3 this is a hard rule, not a style preference — wrap that step's follow-up
  with `test.fixme()` and put the marker in its message/title so it's visible in the test run,
  and list it in your final report as unresolved. Never replace the marker with a plausible
  guess to make the spec "complete."
- **Otherwise**: assert it.
  - Check `playwright/src/actions/assertions/<domain>Assertions.js` for a `verify...` function
    that already covers this expected result. Reuse it.
  - If none exists, run `/add-page-assertion` for it, then use what it created. Same reason as
    step 3 — that skill owns the assertion conventions (verify-prefix, page-object-first,
    web-first matchers, money/text helpers), don't reimplement them here.

### 5. Assemble, then run it

- Data used across steps (product names, addresses, payment details) becomes named constants
  at the top of the file, matching the existing files' style (`PRODUCT`, `ITEM_1`, …) — pull
  the actual values from each step's `testData`, never invent one.
- Add `test.slow()` if the case has enough steps that the default timeout is a real risk
  (every existing multi-step checkout case does this).
- There is no build step (`CLAUDE.md` §7) — verify by running it:
  `npx playwright test <path> --config playwright/playwright.config.js`. Checkout cases place
  real orders on staging; that's expected and deliberate, not a reason to skip running it.
- Report the run result. A spec that only passes on retry, or that had to be muted to pass, is
  not done — say so rather than reporting green.

## Rules

- Zephyr is the source of truth for this spec. If it disagrees with what the app actually
  does, or a step is unautomatable as written, report it — don't quietly patch the gap into
  the spec (`CLAUDE.md` §1).
- `-` in `expectedResult` means "no assertion for this step," not "assert nothing was broken."
- A `⚠ VERIFY` expected result never becomes an assertion. `test.fixme()` it and report it.
- Reuse before creating: search `pages/`, `actions/`, `actions/assertions/` before scaffolding
  anything. When something genuinely is missing, delegate to `/add-page-object` or
  `/add-page-assertion` rather than inlining their conventions here.
- One spec per Zephyr key; update in place if a spec for that key already exists rather than
  duplicating.
- Test title is `<ZEPHYR-KEY> <case name>` — no other convention.
