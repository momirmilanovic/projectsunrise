---
name: add-page-object
description: "Scaffold a Playwright page object (locators + atomic methods) and its composed action (e.g. a fillXForm) from a given URL or pasted HTML. Use when adding automation support for a new screen or form to the playwright/ suite."
user-invocable: true
---

# Add Page Object

Given a page — a URL to inspect live, or raw HTML pasted into the request — produce a page
object under `playwright/src/pages/` and a composed action under
`playwright/src/actions/CustomerActions.js`, following the layered architecture in
`CLAUDE.md` §6: `pages/` holds locators and atomic operations only; `actions/` composes them
into user intent and records a receipt.

## Steps

### 1. Get the real markup

- **URL given:** navigate to it with the Playwright MCP browser tools already configured in
  `.mcp.json` (`mcp__playwright__browser_navigate` then `mcp__playwright__browser_snapshot`),
  not `WebFetch` — Toolshop, and most real targets, is a JS-rendered SPA, so a plain fetch
  returns an empty shell. The snapshot's accessibility tree is exactly what locator choice
  needs: roles, accessible names, and `data-test` attributes together.
- **HTML given:** work directly from the pasted markup. Do not invent structure that isn't in
  it.
- Never guess a selector that wasn't observed in the snapshot or the pasted HTML. If the page
  requires interaction to reveal the form (a modal, a step in a wizard), say so and ask rather
  than fabricating the pre-interaction state.

### 2. Locator selection — mirror the existing pages exactly

Read at least one existing page object (`playwright/src/pages/CartPage.js` or
`BillingStep.js`) before writing the new one, so field ordering, naming, and the `dt()` helper
usage match house style. Rules, from `CLAUDE.md` §6 and observed in every existing page:

- Prefer `page.getByRole` / `getByLabel` over CSS.
- Use `this.dt(name)` (defined on `BasePage`, wraps `[data-test="name"]`) when the accessible
  name is ambiguous or absent — the common case for this app's form fields.
- **Never** build a locator around an id that looks seed-generated (ULIDs, database ids,
  anything not a stable label) — match on accessible name or label text instead.
- One field per constructor line, named after what it represents (`this.email`, not
  `this.emailInput` or `this.inputEmail`).
- A short comment only when the reason for the locator is non-obvious (a shared `data-test`
  needing scoping, a control with no `data-test` at all) — see `CartPage.removeButton` for the
  pattern.

### 3. Write the page object

`playwright/src/pages/<Name>Page.js` (or `<Name>Step.js` if it is one step of an existing
multi-step flow, like `BillingStep`/`PaymentStep`):

```js
import { BasePage } from './BasePage.js';

export class <Name>Page extends BasePage {
  constructor(page) {
    super(page);
    this.field = this.dt('field-data-test');
    // ...one line per field/control found in the markup
  }

  async open() {
    await this.page.goto('<path, from env config — never hardcode a full origin>');
    await this.field.waitFor();
  }

  // Atomic operations only: fill one field, click one control. No journeys, no expect().
  async fillField(value) {
    await this.field.fill(value);
  }
}
```

- **No assertions** inside the page object — that is the `actions/assertions/` layer's job.
- **No multi-field journeys** inside the page object either, *except* a single `fill(data)`
  method that sets every field of one form in one call — that pattern already exists
  (`BillingStep.fill`) and is fine to repeat for a single self-contained form. A journey that
  spans controls belonging to more than one concern (e.g. filling a form *and* submitting it)
  still belongs in `actions/`.
- If a value change is confirmed only by a network round trip (see `waitForCartWrite` /
  `waitForProductQuery` in `utils/network.js`), the page object may await that response
  internally — the one exception to "no waits" in `CLAUDE.md` §6, because it guarantees the
  method's own postcondition rather than a downstream assertion.
- Never write a locator or default value against a `⚠ VERIFY` marker (`CLAUDE.md` §3). If the
  snapshot or HTML doesn't make a field's exact behaviour obvious, mark it and move on rather
  than guessing.

### 4. Register the page

Add one line to `playwright/src/actions/Actor.js`'s constructor, alongside the existing pages
(and the matching import at the top of that file):

```js
this.<name>Page = new <Name>Page(page);
```

Every actor gets every page for free — that is the existing pattern, not a new one to
introduce.

### 5. Write the composed action

Append to `playwright/src/actions/CustomerActions.js` (the only actions class today; ask
before creating a second one) — do not create a new file for a single method:

```js
async fill<Name>Form(data) {
  await this.<name>Page.fillField(data.field);
  // ...one call per page-object atom, in the order a user would fill them
  this.receipts.<name> = data;
  return data;
}
```

Mirror `fillBillingForm` / `fillPaymentForm` in the same file: the action's job is (1) call
page atoms in order, (2) record exactly what was submitted onto `this.receipts`, (3) return
the data. It does not assert — a spec calls an `actions/assertions/` method afterward to
verify the receipt against the page.

### 6. Report, don't silently expand scope

If the target page is bigger than "one form" — a multi-step wizard, several independent
forms, a data table with row actions — stop after scaffolding the piece that was asked for
and tell the user what else exists, rather than generating all of it speculatively
(`CLAUDE.md` §7 — no abstraction ahead of duplication, no unrequested scope).

## Rules

- Inspect the real page (live snapshot or pasted HTML) before writing a single locator — never
  invent one.
- Prefer role/label locators; fall back to `dt()`; never lock onto a seed-generated id.
- Page objects: locators + atomic methods only. No assertions, no multi-concern journeys.
- Actions: compose page atoms, record a receipt, return the data. No raw locators, no
  `expect()`.
- One actions class (`CustomerActions.js`) unless the user asks for another actor.
- Any exact copy, message text, or default value not present in the observed markup gets
  `⚠ VERIFY`, not a guess.
