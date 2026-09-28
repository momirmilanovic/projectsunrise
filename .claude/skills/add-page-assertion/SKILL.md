---
name: add-page-assertion
description: "Scaffold a named assertion method (verifyX(pageObject, ...expected)) for a given page or component, from a URL or pasted HTML, added to playwright/src/actions/assertions/. Use when a spec needs to verify page state that no existing assertion covers."
user-invocable: true
---

# Add Page Assertion

Given a page — a URL to inspect live, or raw HTML pasted into the request — produce one or
more assertion functions under `playwright/src/actions/assertions/`, following
`CLAUDE.md` §6: assertions are named methods called from specs, importing `pages/` and
`utils/` only, never `actions/` (that would create a cycle) and never containing raw
locators of their own.

## Steps

### 1. Get the real markup

- **URL given:** navigate to it with the Playwright MCP browser tools already configured in
  `.mcp.json` (`mcp__playwright__browser_navigate` then `mcp__playwright__browser_snapshot`),
  not `WebFetch` — a JS-rendered SPA returns an empty shell to a plain fetch. The snapshot
  shows exactly what's observable: visible text, roles, states (disabled/checked/etc).
- **HTML given:** work directly from the pasted markup.
- Note the exact copy of anything you intend to assert on (button state, message text, a
  computed total). Do not paraphrase it now and reconstruct it later.

### 2. Find or extend the page object being asserted against

An assertion takes an existing page object as its first parameter — it does not define its
own locators (`CLAUDE.md` §6: "actions/assertions importing pages and utils only").

- If `playwright/src/pages/<Name>Page.js` (or the relevant component/step file) doesn't exist
  yet, stop and say so — scaffold it first with `/add-page-object`, then come back.
- If it exists but is missing a locator this assertion needs, add just that one field to its
  constructor, following the same locator rules as `/add-page-object` (prefer role/label,
  fall back to `this.dt()`, never a seed-generated id). Don't touch anything else in the file.

### 3. Pick the target assertions file

Match the page's domain to an existing file and append to it — `cartAssertions.js`,
`checkoutAssertions.js`, `searchAssertions.js`, `catalogAssertions.js` are the current ones.
Only create a new `<domain>Assertions.js` when none of them fit; ask first if it's unclear
which domain a page belongs to rather than guessing.

### 4. Write the assertion function

```js
import { expect } from '@playwright/test';

export async function verify<Thing>(<pageObjectParam>, expected<Value>) {
  await expect(<pageObjectParam>.<locator>, '<why this should hold>').<matcher>(expected<Value>);
}
```

Conventions, read straight off the existing files before writing the new one:

- Name every export `verify...` — that is the only prefix used in this codebase.
- First parameter is the page object (or component, e.g. `header`) the assertion reads from;
  it is named after that object, matching call sites (`cartPage`, `checkoutPage`, `homePage`,
  `header`). Every value being *checked against* — not read from the page — comes after it as
  its own parameter (`expectedQuantity`, `productNames`, `expectedPayment`), never hardcoded
  inside the function.
- Prefer Playwright's web-first, auto-retrying assertions — `expect(locator).toHaveText(...)`,
  `.toBeVisible()`, `.toBeDisabled()`, `.toHaveValue(...)`, `.toHaveCount(...)` — over reading
  `.textContent()` and comparing manually. Reach for `expect.poll(...)` only when the value is
  derived (e.g. computed from several elements, like `verifyOnlyProductsFrom`), not for things
  a locator matcher already handles.
- Give `expect()` a custom message when the assertion loops over items or the failure
  wouldn't otherwise be self-explanatory (see `verifyCartLineRemoved`, `verifyPaymentDetails`)
  — skip the message on a single obvious check.
- Money comparisons go through `toCents` / `sumCents` / `formatCents` from `utils/money.js` —
  never parse or compare a price as a float. Exact-text comparisons against a value with
  surrounding whitespace or nested elements go through `exactText()` from `utils/text.js`.
- An assertion function normally returns nothing. Only return a value when the assertion
  itself is the sole place that can extract it from the page (see `verifyOrderConfirmed`
  extracting the invoice number) — that's the exception, not the default.
- One assertion = one concern. Don't fold "field is visible" and "field holds the submitted
  value" into the same function if a spec might want either independently — but don't split
  a single always-together check (like `verifyProductPageDisplayed`'s full-page smoke check)
  into six functions nobody will call separately either. Match the granularity already used
  for the same kind of check elsewhere in the file.

### 5. Respect ⚠ VERIFY

If what you're being asked to assert on — exact message text, a status code, a label — was
not directly observed in the snapshot or the pasted HTML, do not write the assertion against
a guessed value. Say what's missing and stop; per `CLAUDE.md` §3, an assertion against an
unverified string must never be written, not even provisionally.

## Rules

- Never invent a locator inside an assertions file — read it off the page object, adding a
  field there first only if genuinely missing.
- `verify` prefix, page object first, expected values as explicit parameters — never
  hardcoded.
- Web-first `expect()` matchers by default; `expect.poll()` only for derived values.
- Money via `utils/money.js`; exact text via `utils/text.js`. No float price comparisons.
- Append to the matching domain file; create a new one only when none fits, and ask if unsure
  which domain applies.
- No assertion against a value that wasn't actually observed — mark it `⚠ VERIFY` and stop
  instead of guessing.
