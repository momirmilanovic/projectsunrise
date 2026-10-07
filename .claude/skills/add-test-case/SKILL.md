---
name: add-test-case
description: "Author a new test case from a prompt description, align its step/expected-result phrasing with the Zephyr cases already live for the module, add it to testcases/{module}.json, then push it via the Zephyr MCP write tools. Use when asked to create, write, or add a new test case for a module."
user-invocable: true
---

# Add Test Case

Author one new test case from a prompt description, align it with the Zephyr cases already
live for the module, add it to `testcases/{module}.json`, and push it. This is the authoring
counterpart to `/add-test-from-zephyr`: that skill turns a live Zephyr case into a Playwright
spec; this one turns a prompt into a Zephyr case. Per `CLAUDE.md` §1, authoring and pushing are
separate concerns — this skill does both, explicitly in that order, without blurring the
boundary the push agent depends on (the JSON must already be correct before anything is
pushed).

**Push path note:** `CLAUDE.md` §5 designates `scripts/push-to-zephyr.mjs` as the only write
path to Zephyr, precisely because it gives a dry run, an existence check, region detection and
vocabulary validation for free, and resumes cleanly after a partial failure. This skill is a
deliberate, requested exception — it pushes through the Zephyr MCP write tools instead, the
same way `.claude/agents/zephyr-push-mcp.md` does for the checkout bulk push. Step 6 below
exists to manually reimplement what the script would otherwise give away, and skipping any
part of it is how the MCP path creates duplicates in a live system.

## Steps

### 1. Resolve the module and its coordinates

- From the prompt, identify which module table row (`CLAUDE.md` §2) the case belongs to. Read
  that table fresh rather than relying on a cached copy, for `moduleCode`, `jiraIssue` /
  `jiraIssueId`, and `zephyrFolder`.
- If the module has no Jira issue yet (every row except Checkout, as of this writing), say so:
  the case can still be authored and added to the JSON, but it cannot carry a real `coverage`
  value or be linked when pushed. Stop before step 6 in that case and report the case as
  authored-but-not-pushable.
- Locate `testcases/{module-slug}.json`. If it doesn't exist yet, create it with the header
  shape from `testcases/checkout.json` — `module`, `moduleCode`, `jiraIssue`, `jiraIssueId`,
  `zephyrFolder`, `testCases: []`.

### 2. Compute the stable id

- `{MODULE_CODE}-TC-{NN}`, zero-padded to two digits, matching the existing file's style.
- Scan **every** `testcases/*.json` for ids sharing this `moduleCode`, not just the target
  file — Authentication registration and login share the `AUTH` code (§2 table), so once both
  files exist, numbering must stay unique across them.
- Increment from the highest `NN` found for that code.

### 3. Pull existing cases for style alignment

- Prefer live Zephyr: use the read-only `mcp__zephyr__zephyr_get_test_cases` /
  `zephyr_get_test_case` / `zephyr_get_test_case_steps` tools (never the write ones — authoring
  is not pushing, §5) against the module's `zephyrFolder` to pull 2-3 sibling cases already
  imported, for their step wording and expected-result phrasing.
- If the Zephyr MCP is unreachable, say so explicitly (a connection timeout is a connection
  failure, not evidence the integration doesn't exist — don't silently reinterpret it) and fall
  back to the sibling cases already in `testcases/checkout.json` as the style reference. State
  plainly that live Zephyr wasn't consulted this run.
- What "aligned" means concretely: imperative step wording ("Open the cart...", "Click...", not
  "User opens..."); expected results stated as observed fact, not "should"; named data
  placeholders (`CART-1`, `ADDR-VALID`) rather than a literal value repeated across steps; steps
  and expected results are 1:1 (§4 — a step without an expected is a comment, not a step).

### 4. Author the case

Follow the JSON shape in `CLAUDE.md` §4 exactly. Field by field:

- `id` — from step 2.
- `name` / `objective` — from the prompt. The objective states what the case proves, not what
  it clicks.
- `precondition` — **defaults to `"1. User is on the home page."`** Only add further lines, or
  change the starting point, when the prompt actually says so (a specific signed-in identity,
  an existing cart, a DB reset, a different starting screen). Don't pad it with boilerplate the
  prompt didn't ask for, and don't drop the home-page default just because it seems obvious for
  the case at hand.
- `priority` / `status` — validate against the project's real vocabulary before writing:
  `High` / `Normal` / `Low` (there is no `Medium`) and `Draft` / `Deprecated` / `Approved` for
  `KAN`, confirmed via `mcp__zephyr__zephyr_get_priorities` / `zephyr_get_statuses` when
  reachable. New cases are always authored `Draft` — never `Approved` — regardless of what's
  asked (`CLAUDE.md` §3).
- `type` / `severity` / `labels` — from the prompt; labels always include `toolshop` and the
  module's own tag, matching sibling cases.
- `coverage` — the module's Jira issue key, once one exists.
- `covers_rules` — the business rule id(s) the prompt names. If the prompt doesn't name one,
  ask — don't fabricate a `BR-N`. A case authored with no rule is a traceability gap per §4 and
  must be named as one in the report, not silently left blank.
- `steps` — one object per step: `step` / `data` / `expected`, every step carrying its own
  `expected`. **Never invent UI copy, selector-adjacent detail, or payment/status-code
  specifics that haven't been observed** (`CLAUDE.md` §3, §7). Where the prompt doesn't supply
  a concrete expected result and it can't be safely derived from the Swagger or an already-
  `Observed values` entry in `CLAUDE.md` §3, write that step's `expected` with a `⚠ VERIFY`
  marker instead of a plausible guess.

### 5. Write it

- Append the case object to the target file's `testCases` array, in id order, matching the
  file's existing formatting.
- Read the file back to confirm the JSON is well-formed and the new id doesn't collide with one
  already present.

### 6. Push it — through the Zephyr MCP write tools

The MCP server reads `ZEPHYR_API_TOKEN` from the **shell environment**, not `.env`. If it's
unset every call fails `401 {"error":"Unknown token"}` — the same body a wrong-region token
gives, but `.mcp.json` already pins the correct DE host, so on a blanket 401 report that the
token isn't visible to the MCP server rather than chasing a region problem.

**Plan first — no writes on the first pass:**

1. `mcp__zephyr__zephyr_get_priorities` / `zephyr_get_statuses` for `KAN`. Confirm the case's
   `priority` and `status` (from step 4) are in the returned lists. If not, fix the source now
   — this skill just authored it, so this is the one place in the pipeline allowed to correct
   it — and re-check.
2. `mcp__zephyr__zephyr_get_folders` for the module's `zephyrFolder`. If it's genuinely missing,
   `zephyr_create_folder` with `folderType: "TEST_CASE"` and `parentId: null` for a root folder
   (never omitted).
3. `mcp__zephyr__zephyr_get_test_cases` for that folder. Match on the stable-id label (falling
   back to the `{ID}: ` name prefix) to confirm this id doesn't already exist in Zephyr — this
   is the existence check the script would otherwise give for free. If it's already there,
   this is an update, not a create (see below).
4. Report the plan — create or update, target folder, priority/status already validated — and
   stop. Ask before continuing. Pushing writes to a shared Jira/Zephyr instance; that needs a
   confirmation even though the invoking request was "create and push."

**Apply, only after confirmation, three calls for a create:**

1. `mcp__zephyr__zephyr_create_test_case` with `projectKey: "KAN"`, `name: "{ID}: " + name`,
   `objective`, `precondition`, `priorityName`, `statusName`, `folderId`, and `labels`
   including the stable id — returns `key` (e.g. `KAN-T6`). The stable id must appear in both
   the `name` prefix and `labels`, or the next run can't find this case to avoid duplicating it.
2. `mcp__zephyr__zephyr_create_test_case_steps` with `mode: "OVERWRITE"` (never `APPEND` — it
   duplicates every step on a re-run) and one `{ inline: { description, testData,
   expectedResult } }` per step, in order.
3. `mcp__zephyr__zephyr_create_test_case_issue_link` with the module's `jiraIssueId` (the
   numeric id, never the key).

For an update to a case already in Zephyr, use `zephyr_update_test_case` (merges server-side —
pass only `testCaseKey` plus the changed fields; `labels` is a full replace, so include the
stable id every time) then `zephyr_create_test_case_steps` with `OVERWRITE` again.

Finish all three calls for one case before considering it done. If a call fails mid-case, stop
immediately and report which of the three completed — don't retry a `create_test_case` whose
response you already have, and don't leave a case half-linked without saying so.

If step 1 found no Jira issue for this module, stop before this step entirely: report the case
as authored and ready, not pushable until KAN has an issue for that module.

### 7. Report

State: the new id, its name, whether it carries any `⚠ VERIFY` markers (and how many), whether
it's linkable yet, and the plan/apply result. If actually pushed, give the Zephyr key it was
created or updated as, and confirm the issue link landed.

## Rules

- Authoring and pushing are sequential, never merged — the JSON is fully correct before any
  MCP write call runs (`CLAUDE.md` §1).
- Default precondition is `"User is on the home page."` — depart from it only when the prompt
  says to.
- Never author a case `Approved`. Never resolve a `⚠ VERIFY` with a guess.
- Never invent a business rule id, a selector, a message string, or a payment/status-code
  detail that hasn't been observed or isn't in the Swagger.
- Plan first — priorities/statuses validated, existence checked, folder confirmed — and apply
  only with explicit confirmation. This is the same discipline `scripts/push-to-zephyr.mjs`
  gives automatically; on the MCP path, this skill is responsible for it by hand.
- `mode` on `create_test_case_steps` is always `OVERWRITE`, never `APPEND`.
- `moduleCode` uniqueness spans every `testcases/*.json` file that shares it, not just the one
  being edited.
