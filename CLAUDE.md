# CLAUDE.md

Working agreement for this repository. Read this before doing anything else in the project.

---

## 1. What this project is

Two workstreams against one target application:

1. **Zephyr push** — take test cases authored as JSON in this repo and create them in
   Zephyr (Jira Cloud), linked back to their originating Jira issue.
2. **Playwright automation** — implement test cases as a JavaScript Playwright suite.

**JavaScript is the main language of this repo.** The automation suite is plain ESM
JavaScript — no TypeScript, no build step, no typecheck.

The two workstreams have **different inputs**, and this matters:

- The push workstream authors into `testcases/*.json` and pushes those upward into Zephyr.
- The automation workstream takes its cases **from Zephyr, handed over as Jira/Zephyr
  links**. It does not read `testcases/*.json`.

So Zephyr is what the automation implements against. If a Zephyr case is wrong, ambiguous, or
missing expected results, **report it and get the case fixed** — do not quietly invent the
missing half in the spec. Never let a Playwright spec drift from the case it names.

### Target application: Toolshop (Practice Software Testing)

A B2C web store for hand tools and power tools. Angular SPA frontend, Laravel REST API backend.
Purpose-built for testing practice, so it has real docs and a Swagger spec.

| | |
|---|---|
| App (staging) | https://practicesoftwaretesting.com |
| API (staging) | https://api.practicesoftwaretesting.com |
| App (local) | http://localhost:4200 |
| API (local) | http://localhost:8091 |
| Swagger | `{API}/api/documentation` |
| Deliberately broken build | https://with-bugs.practicesoftwaretesting.com |
| Docs | https://testsmith-io.github.io/practice-software-testing/ |
| Source | https://github.com/testsmith-io/practice-software-testing |
| MailCatcher (local) | http://localhost:1080 |
| PHPMyAdmin (local) | http://localhost:8000 (root/root) |

**Author and run against local Docker.** The staging database is shared with every other person
practising on this app worldwide. It cannot be reset, other people mutate it concurrently, and
any assertion on counts, "the newest record", or stock levels will be flaky by construction.
Staging is for read-only smoke checks only.

Database reset (the answer to nearly every teardown):

```bash
docker exec -it pst-laravel-api-1 php artisan migrate:fresh --seed
```

Seeded accounts:

| ID | Role | Email | Password |
|---|---|---|---|
| `U_CUSTOMER` | customer | customer@practicesoftwaretesting.com | welcome01 |
| `U_CUSTOMER2` | customer | customer2@practicesoftwaretesting.com | welcome01 |
| `U_ADMIN` | admin | admin@practicesoftwaretesting.com | welcome01 |
| `U_GUEST` | guest | — | — |

Never hardcode these in specs. They belong in `config/users.ts`, read from env with these as
local defaults.

### Jira and Zephyr coordinates

| | |
|---|---|
| Site | https://momirm.atlassian.net |
| Project | `KAN` |
| Epic | `KAN-7` — Implement full QA cycle by AI |
| Pipeline ticket | `KAN-9` — Generate AI-assisted test cases in Zephyr |
| Template ticket | `KAN-11` — Jira issue template for QA-ready tickets (Done) |
| First module ticket | `KAN-18` — [Checkout] Complete an order through the checkout flow (numeric id **10059**) |
| Zephyr product | **Zephyr** — SmartBear's unified app, built on the former Zephyr Scale platform. Installed as a Forge app. |
| Zephyr API region | **DE** — `https://de.api.zephyrscale.smartbear.com/v2` |
| Zephyr project id | `1374` (numeric, appears in API error messages) |
| Zephyr folder root | `/Toolshop` |

Zephyr test cases are **not** Jira issues. They live in SmartBear's store behind a separate
API and a separate token. The Atlassian MCP connector cannot create them.

**Do not confuse the three Zephyr products** — the naming actively misleads:

| Product | Test case is | API |
|---|---|---|
| **Zephyr** (ours) | a Zephyr entity | `api.zephyrscale.smartbear.com/v2`, bearer token |
| Zephyr Essential (ex-Squad) | a Zephyr entity | `prod-api.zephyr4jiracloud.com/v2`, bearer token — same v2 shapes |
| legacy Squad experience | a **Jira issue** of type `Test` | `.../connect`, per-request signed JWT |

If a token is refused, check the product and the region before touching the payload.

---

## 2. Current state

Eleven module tickets are planned. One exists.

| Module | Code | Jira | Zephyr folder | Cases | Status |
|---|---|---|---|---|---|
| Checkout | `CHK` | KAN-18 | `/Toolshop/Checkout` (id 43806) | 14 | 5 written **and pushed**, 9 blocked |
| Authentication — registration | `AUTH` | — | `/Toolshop/Authentication/Registration` | ~10 | not started |
| Authentication — login | `AUTH` | — | `/Toolshop/Authentication/Login` | ~12 | not started |
| Catalog — product list | `CAT` | — | `/Toolshop/Catalog/Product List` | ~12 | not started |
| Catalog — search | `SRCH` | — | `/Toolshop/Catalog/Search` | ~9 | not started |
| Catalog — product detail | `PDP` | — | `/Toolshop/Catalog/Product Detail` | ~8 | not started |
| Cart | `CART` | — | `/Toolshop/Cart` | ~12 | not started |
| Orders & invoices | `INV` | — | `/Toolshop/Account/Invoices` | ~8 | not started |
| Profile & favourites | `ACCT` | — | `/Toolshop/Account/Profile` | ~10 | not started |
| Contact | `CONT` | — | `/Toolshop/Contact` | ~8 | not started |
| Admin — catalog | `ADM` | — | `/Toolshop/Admin/Catalog` | ~12 | not started |
| API contract | `API` | — | `/Toolshop/API` | TBD | proposed, not agreed |

The five written Checkout cases are pushed and live, all `Draft`, all linked to KAN-18:

| Stable ID | Zephyr key | Steps |
|---|---|---|
| `CHK-TC-01` | `KAN-T1` | 9 |
| `CHK-TC-03` | `KAN-T2` | 5 |
| `CHK-TC-05` | `KAN-T3` | 6 |
| `CHK-TC-07` | `KAN-T5` | 7 — 2 unresolved `⚠ VERIFY` |
| `CHK-TC-14` | `KAN-T4` | 5 — 1 unresolved `⚠ VERIFY` |

Zephyr keys are recorded for convenience only. They are **not** stable across re-imports —
`{MODULE_CODE}-TC-{NN}` is the durable id, carried as a Zephyr label on each case.

---

## 3. The ⚠ VERIFY rule

This is the most important convention in the repo. **Do not violate it to make output look
complete.**

An AI can read the Swagger spec and get endpoints, status codes and schema fields right. It
cannot know that the cart says `"Product added to shopping cart."` rather than
`"Item added to cart"` without someone observing the running application.

So: any value inferred rather than observed is marked `⚠ VERIFY` and stays that way until a
human confirms it against the running app. This applies to exact UI message text, validation
copy, payment method names, and any status code not explicitly in the Swagger.

- **Never** replace a `⚠ VERIFY` marker with a plausible guess.
- **Never** write a Playwright assertion against a `⚠ VERIFY` string. Implement the case up to
  the point of that assertion and mark the test `test.fixme()` with the marker in the title.
- A test case with unresolved `⚠ VERIFY` markers must not reach Zephyr status `Approved`.

The reasoning: a suite that fails for the wrong reason gets muted, and a muted suite is worse
than no suite.

### Open questions

Observed against staging on 2026-09-01. Probes in `scripts/explore/`, artefacts and
screenshots under `artifacts/` (gitignored).

| # | Question | Status |
|---|---|---|
| Q1 | Does completing an order decrement product stock? | **Open** — needs a confirmed order, which pollutes shared staging |
| Q2 | Is an order confirmation email sent? | **Open, unanswerable on staging** — MailCatcher is `localhost:1080` only |
| Q3 | Unauthenticated `POST /invoices` — 401 or 403? | **Resolved: 401**, body `{"message":"Unauthorized"}`. A malformed bearer gives the same |
| Q4 | Is the billing address prefilled from the profile, and persisted back? | **Partly resolved:** `street` and `city` prefill; `country`, `postal_code`, `house_number`, `state` do not. Persistence back to the profile is still unobserved |

### Observed values — do not re-derive these

| Thing | Observed |
|---|---|
| Add-to-cart toast | `Product added to shopping cart.` |
| Quantity-change toast | `Product quantity updated.` |
| Cart quantity out of range | `PUT /carts/{id}/product/quantity` → **`404 {"message":"Resource not found"}`** for `0`, `-1` and `1.5`. The Swagger says `422`; the app does not. Cart keeps its last valid quantity |
| Quantity `0` in the UI | Clamped client-side — the app sends `{"quantity":1}`, gets `200`, and shows the *success* toast. No rejection message exists |
| Quantity recalculation | `PUT /carts/{id}/product/quantity` then `GET /carts/{id}`, both `200`. Assert after the response, never after a delay |
| Remove cart line | `DELETE /carts/{id}/product/{productId}` → `204`, then `GET` → `200`. Control is `<a class="btn btn-danger">` with an `fa-xmark` icon and **no `data-test` hook** |
| Empty cart at `/checkout` | Stepper renders; body is empty. No line table, no total, no proceed control. Same end state as removing the last line |
| Billing mandatory set (UI) | `country`, `postal_code`, `house_number`, `street`. `city` and `state` are optional — **narrower than the API**, which requires `billing_city` and `billing_state` |
| Payment methods (displayed → enum) | `Bank Transfer`→`bank-transfer`, `Cash on Delivery`→`cash-on-delivery`, `Credit Card`→`credit-card`, `Buy Now Pay Later`→`buy-now-pay-later`, `Gift Card`→`gift-card`. Placeholder `Choose your payment method`, disabled once a method is chosen |
| Per-method fields | credit-card: `credit_card_number`, `expiration_date`, `cvv`, `card_holder_name` · bank-transfer: `bank_name`, `account_name`, `account_number` · gift-card: `gift_card_number`, `validation_code` · buy-now-pay-later: `monthly_installments` · cash-on-delivery: none |
| How both gates work | By **disabling the control**. No validation copy is shown anywhere on the billing or payment step. Assert `toBeDisabled()` |
| Guest checkout | `Continue as Guest` is offered at the sign-in step, and `POST /invoices/guest` has no security requirement — **`BR-2` is false as written** |
| Product ids | ULIDs, e.g. `01M1EDF0JJAHF9NSSKMTFZ7FRX`. Not integers |
| **Staging reseeds itself** | Verified 2026-09-10: every product, category and brand ULID changed within ~30 minutes (`01M25PF8…` → `01M25SX2…`), while every **name and price stayed identical**. A ULID captured earlier returns `404`. **Never persist an id — locate and assert by name or label.** The upside: the catalogue is deterministic, so expected name sets are stable |
| Category / brand filters | Checkboxes are `[data-test="category-<ULID>"]` / `[data-test="brand-<ULID>"]` with `name="category_id"` / `name="brand_id"`. The ULID is seed-generated, so match on the accessible name from the label instead |
| Filter results | `Hammer` → 7 products. `Hammer` + `ForgeFlex Tools` → 6, dropping `Claw Hammer` (the only MightyCraft hammer). Filters intersect |
| Product cards | `a[data-test="product-<ULID>"]` containing `[data-test="product-name"]` and `[data-test="product-price"]`. **No category or brand is exposed on the card** |

### v5.0 selector corrections (verified 2026-09-10)

The app is now **v5.0 / Angular 20.0.5** and has gained Rentals, an eco filter and CO₂
ratings. Several hooks recorded on 2026-09-01 were wrong:

| Thing | Correct value |
|---|---|
| PDP quantity | `[data-test="quantity"]` — **not** `product-quantity`, which is the *cart line* quantity |
| PDP | `unit-price`, `product-description`, `increase-quantity`, `decrease-quantity`, `add-to-cart`, `add-to-favorites`, `add-to-compare` |
| Cart line | `product-title`, `product-quantity`, `product-price`, `line-price`; total is `td[data-test="cart-total"]` |
| Stepper | `CART 1 → SIGN IN 2 → BILLING ADDRESS 3 → PAYMENT 4`. `proceed-1` on the cart step, **`proceed-2-guest`** on the guest sign-in path, `proceed-3` on billing, `finish` on payment |
| Guest path | The sign-in step has two tabs; the guest one is `a[role="tab"]` named `Continue as Guest`. Fields `guest-email`, `guest-first-name`, `guest-last-name`, `guest-submit` |
| Login | `login-form`, `email`, `password`, `login-submit` (an `input[type=submit]`) |
| Country | A `<select>` whose **option values are ISO 3166-1 alpha-2 codes** — `NL` renders as `Netherlands (the)`, `RS` as `Serbia`. Select by code |
| Buy Now Pay Later | `monthly_installments` is a `<select>`, values `3` / `6` / `9` / `12`, labelled `6 Monthly Installments` |
| Bank transfer | `bank_name`, `account_name`, `account_number`, all text inputs |
| Confirm gate | `finish` stays `disabled` until the per-method fields are filled. No validation copy |
| Billing step | Has **no name field** — only country, postal code, house number, street, city, state |

Three defect candidates recorded in the cases: the `404`, the misleading success toast, and
the UI/API mandatory-field mismatch.

---

## 4. Test case format and IDs

### Stable IDs

`{MODULE_CODE}-TC-{NN}` → `CHK-TC-05`

Zephyr assigns its own keys (`KAN-T1`, `KAN-T2`, …) on import and those are **not stable
across re-imports**. Our ID is the durable one. It appears in three places and must match in
all three:

1. `testcases/{module}.json` → `id`
2. The Zephyr test case **name prefix** and a label
3. The Playwright test title: `test('CHK-TC-05 Order total equals the sum of line totals', …)`

That is what makes a Playwright failure traceable to a Zephyr case and a Jira ticket without a
mapping table.

### Traceability

Every test case carries `covers_rules: ["BR-4"]`, referencing business rules numbered in its
Jira ticket. Any business rule with no covering case is a coverage gap; any case covering no
rule is either untraceable or an exploratory finding that should be promoted into a rule.

### JSON shape

```json
{
  "id": "CHK-TC-05",
  "name": "Order total equals the sum of line totals",
  "objective": "Verify that each line total is unit price times quantity and that the order total is their exact sum.",
  "precondition": "1. Database freshly seeded.\n2. U-customer is signed in.\n...",
  "priority": "High",
  "status": "Draft",
  "type": "positive",
  "severity": "Critical",
  "labels": ["toolshop", "checkout", "calculation"],
  "coverage": "KAN-18",
  "covers_rules": ["BR-4"],
  "steps": [
    { "step": "...", "data": "CART-MULTI", "expected": "..." }
  ]
}
```

Steps are numbered implicitly by array order. Every step has its own `expected` — a step
without an expected result is not a step, it is a comment.

---

## 5. Zephyr push

One script: `scripts/push-to-zephyr.mjs`. Dry run by default, `--apply` writes,
`--only ID` narrows, `--force` overrides the existence check.

```bash
node scripts/push-to-zephyr.mjs testcases/checkout.json            # read-only
node scripts/push-to-zephyr.mjs testcases/checkout.json --apply    # writes
```

### Auth and region

Header `Authorization: Bearer $ZEPHYR_TOKEN`. Token from Jira → **Settings → General
Settings → Apps → Zephyr API Access Tokens → Create access token**. Revoke via profile
icon → API Access Tokens. One token per user per Jira instance. Keep it in `.env`, never
committed.

**Zephyr Cloud is region-sharded and a token is only valid in its own region.** The other
regions answer `401 {"error":"Unknown token"}` — indistinguishable from a bad token, and
the single most expensive dead end in this project so far. The documented hosts are:

```
https://api.zephyrscale.smartbear.com/v2      US / default
https://eu.api.zephyrscale.smartbear.com/v2
https://de.api.zephyrscale.smartbear.com/v2   <- this tenant
https://au.api.zephyrscale.smartbear.com/v2
```

The script probes all four and prints which one authenticated. Pin it with
`ZEPHYR_BASE_URL` to skip detection. **If a token is refused, suspect the region before
the token, and the token before the payload.**

### Calls

Three per test case:

```
POST /testcases                        -> { key }
POST /testcases/{key}/teststeps        { mode: "OVERWRITE", items: [{ inline: {...} }] }
POST /testcases/{key}/links/issues     { issueId: 10059 }
```

Field names that matter: `projectKey`, `name`, `objective`, `precondition`, `priorityName`,
`statusName`, `folderId`, `labels`. Step shape is
`{ inline: { description, testData, expectedResult } }`. Folders come from `POST /folders`
with `folderType: "TEST_CASE"`; `parentId` must be `null` for a root folder, not omitted.

**`links/issues` takes the numeric issue id, not the key.** KAN-18 is `10059`.

### Per-project vocabularies

Priority and status names are **per-project, not fixed enums**. For `KAN`:

| | |
|---|---|
| Priorities | `High` / `Normal` / `Low` — **there is no `Medium`** |
| Test case statuses | `Draft` / `Deprecated` / `Approved` |

A wrong name fails that one `POST /testcases` with
`404 Priority with the name 'X' was not found on projectId 1374` — part-way through a push,
after earlier cases have already been created. The script now validates every case's
priority and status against `GET /priorities` and `GET /statuses` before the first write.
Read them from the API rather than assuming; another project may differ.

### Idempotency, and updating an existing case

The script lists existing cases in the target folder and skips any whose name already
matches, so a re-run after a partial failure resumes rather than duplicating. Keep this
property when adding features to it.

| Flag | Behaviour on a case that already exists |
|---|---|
| *(none)* | skip |
| `--update` | read-modify-write — **this is the one you want** |
| `--force` | create a second copy. Almost never what you want |

`--update` exists because `PUT /testcases/{key}` is a full replace requiring `id`, `key`,
`name`, `project`, `priority` and `status`, with `priority` / `status` / `folder` as
`{ id }` objects rather than names. So it `GET`s the live case, patches the authored
fields onto it, `PUT`s it back, and overwrites the steps. Do not try to construct that
payload from the JSON alone.

### Ownership of the write path

`scripts/push-to-zephyr.mjs` is the only thing that writes to Zephyr. The
`@smartbear/mcp` server configured in `.mcp.json` exposes `create-test-case`,
`create-test-steps` and friends, and it is deliberately **not** used for pushing — going
through it loses the dry run, the existence check, region detection and vocabulary
validation, and a partial failure duplicates instead of resuming. Use the MCP for reads
and ad-hoc queries.

Note the MCP does not probe regions, so `.mcp.json` pins the DE host explicitly. Its
token comes from `ZEPHYR_API_TOKEN` in the **shell** environment, not from `.env`.

### Push agent

`.claude/agents/zephyr-push.md` owns the push step and nothing else: run the script against
a `testcases/*.json` source, diagnose failures, reconcile source against Zephyr, report. It
has no `Write` or `Edit` tool by design — if the source is wrong it reports and stops rather
than fixing it.

Authoring is a separate concern and will get its own agent. Keep the boundary: the push
agent treats the JSON as an immutable input.

### CSV import

Not usable here, and the two `zephyr-import-checkout-*.csv` files have been deleted. Their
columns were Zephyr Scale importer columns; this app's importer is a different tool. If a
no-token path is ever needed again, work it out against the live importer's Field Mapping
stage rather than reviving those files — unmapped columns are dropped silently and produce
test cases with empty scripts.

Use the API.

---

## 6. Playwright architecture

**JavaScript** (ESM), Playwright Test runner, **UI tests only**. Build it as a test
automation engineer would for a product they have to maintain for two years — not as a demo.

Four levels, and the separation is the point:

| Level | Holds | Never holds |
|---|---|---|
| `pages/` | locators and **atomic** operations: `checkCategory(label)`, `clickNext()` | journeys, assertions |
| `actions/` | **user intent** composed from page atoms, bound to an actor: `fillPaymentForm(details)` | raw locators |
| `actions/assertions/` | named assertion methods **called from specs** | actions (would create a cycle) |
| `tests/` | Zephyr-keyed specs calling actor actions, then assertions | inline locators, bare `expect` on DOM |

Imports run strictly one way: `pages` → `actions` → `tests`, with `actions/assertions`
importing `pages` and `utils` only.

### Layout

```
playwright/
├── playwright.config.js
├── jsconfig.json           # editor intellisense only - there is no build step
├── setup/auth.setup.js     # "setup" project: UI login per role -> .auth/<role>.json
├── src/
│   ├── config/             # env.js (staging URLs + .env parsing), actors.js (registry)
│   ├── pages/              # BasePage, HomePage, ProductPage, CartPage, CheckoutPage,
│   │   │                   # BillingStep, PaymentStep, LoginPage, components/Header
│   │   └── index.js        # buildPages(page) -> one frozen bundle per context
│   ├── actions/
│   │   ├── Actor.js        # identity + pages + receipts
│   │   ├── CustomerActions.js
│   │   └── assertions/     # search / cart / checkout assertion methods
│   ├── data/               # catalogue.js, billing.js, payments.js
│   ├── utils/              # money (integer cents), network waits, invoice, text, session
│   └── fixtures/           # actors.fixture.js, workerAuth.fixture.js, index.js
├── tests/
│   ├── search/             # one spec per Zephyr case, filename carries the key
│   └── checkout/
└── .auth/                  # storageState files, gitignored
```

An actor carries a **`receipts`** object: every action that submits data records exactly what
it typed. Assertions then verify the page against the receipt, so a spec never restates the
same literal twice:

```js
const payment = await regularUser.fillPaymentForm(bankTransfer());
await assertPaymentDetails(regularUser.pages, payment);
```

### Page objects

- Expose **behaviour**, not selectors: `checkoutPage.completeOrder(address, method)`, not
  `checkoutPage.confirmButton.click()`.
- No assertions inside page objects. Page objects act and return state; specs assert. The one
  exception is an internal wait that guarantees a method's postcondition.
- Locators as instance fields set in the constructor, resolved via `page.getByRole` /
  `getByLabel` / `getByTestId`. Prefer role and label over CSS. Toolshop has `data-test`
  attributes in many places — use them when the accessible name is ambiguous, not by default,
  and **never when the attribute embeds a seed-generated ULID** (see §3).
- No `page.waitForTimeout`. Ever. See below.

### The async recalculation trap

Documented in KAN-18 §9 and it will bite: **the cart total updates asynchronously after a
quantity change.** Asserting immediately after typing races the API call.

```ts
// wrong - races the PUT, passes locally, flakes in CI
await cartPage.setQuantity(0, 3);
await expect(cartPage.total).toHaveText('$44.97');

// right - wait on the response that causes the change
await Promise.all([
  page.waitForResponse(r => r.url().includes('/carts') && r.request().method() === 'PUT'),
  cartPage.setQuantity(0, 3),
]);
await expect(cartPage.total).toHaveText('$44.97');
```

Web-first assertions (`expect(locator).toHaveText`) auto-retry and handle most cases. Use the
response wait when the change is triggered by a network round trip whose completion is not
otherwise observable.

### Authentication

Auth goes **through the UI**. `LoginPage.signIn(email, password)` is the single
implementation; both fixture flavours call it, so login logic exists once.

Two flavours, both available from `src/fixtures/index.js` — a spec just names the fixture it
wants, and fixtures are lazy so it only pays for that one:

| Fixture | Flavour | Behaviour |
|---|---|---|
| `regularUser`, `secondUser` | storageState + `setup` project | Signs in once for the whole run, each test gets its own context. **The default.** |
| `workerCustomer` | worker-scoped | One UI sign-in per worker, reused across that worker's tests. Simpler, weaker isolation. |
| `guest` | clean | Fresh context, no `storageState`, cookies and storage cleared. A distinct fixture, not the default with a logout appended. |

Accounts and their password variables live in `src/config/actors.js`:

| Actor | Email | Password from |
|---|---|---|
| `regularUser` | `tester.testerson@gmail.com` | `TEST_PASSWORD` |
| `secondUser` | `testera.testersona@gmail.com` | `TESTA_PASSWORD` |

Passwords come from the environment only and are never written into a spec, a page object or
the registry. A missing variable throws a named error at setup time rather than attempting a
blank login.

Give the two order-placing specs **different actors** so they never share a server-side cart
when running in parallel.

### Data and isolation

- Fully parallel by default. Any test that cannot run in parallel needs a comment saying why.
- Never assert on "the newest invoice" or on record counts. Assert on the identifier your own
  test created. This is non-negotiable on staging and good hygiene locally.
- Money is integer cents in test data and comparisons. No float arithmetic on prices.
  `CHK-TC-05` exists specifically to catch rounding drift; it must not introduce its own.
- Prefer per-test data creation over a shared seeded fixture. Use `migrate:fresh --seed` as a
  suite-level reset, not between individual tests.

### Config

**Staging only** — `https://practicesoftwaretesting.com`. `src/config/env.js` is the single
place a URL appears; never hardcode one in a spec or page object. There is no `TEST_ENV`
switch, no local Docker target and no `with-bugs` target in this suite.

Because staging is shared worldwide and cannot be reset, two things follow. The checkout
specs **place real orders** — run them deliberately. And every assertion must key off an
identifier the test itself created or a name the seeder guarantees, never a count, never "the
newest" anything.

### Reporting

HTML reporter locally; on CI add JUnit XML for the Zephyr execution import. Trace, screenshot
and video on first retry only. Retries: 0 locally, 2 on CI — and a test that only passes on
retry is a bug report, not a pass.

---

## 7. Working rules

- **Do not mark a test case complete while it has `⚠ VERIFY` markers.** Use `test.fixme()`.
- **Do not invent selectors, message text, or payment method names.** If the app has not been
  inspected, say so and stop. Guessing here produces work that has to be redone.
- **Do not add a dependency without saying why.** Playwright's built-in fixtures, `expect`, and
  `request` cover almost everything. No Cucumber, no external assertion library, no reporter
  plugins unless there is a stated need.
- **Do not create abstraction ahead of duplication.** A `BaseTest` class, a helper layer over
  `expect`, or a generic `fillForm(fields)` before three concrete forms exist is speculative.
- **When a Zephyr or Jira call fails, read the response body** before changing the payload. The
  API names the offending field. Do not guess at field names by trying variations.
- There is no typecheck or build step. Verify JavaScript work by **running the specs**.
- Keep commits scoped to one module or one concern.
- If instructions here conflict with a request, say so rather than silently following one.

---

## 8. Order of work

1. Resolve Q1–Q4 and the `⚠ VERIFY` items for Checkout by exploring the running app.
2. Complete the nine blocked Checkout cases in `testcases/checkout.json`.
3. Push them to Zephyr via `scripts/push-to-zephyr.mjs`. The five written cases are already
   live (`KAN-T1`–`T5`); re-running pushes only the new ones. Once Q1–Q4 are resolved, the
   two cases carrying `⚠ VERIFY` markers need their steps corrected and re-pushed with
   `--force`.
4. **Done** — the Playwright skeleton exists: config, both fixture flavours, UI auth setup,
   pages, actions, assertions, data and utils.
5. **Done** — `KAN-T15`, `KAN-T16` and `KAN-T17` are implemented under `playwright/tests/`.
6. Extend to further Zephyr cases as they are handed over as links, reusing the existing
   layers. Add a page object only when a case needs a screen that has none.

The automation backlog is driven by Zephyr links, not by `testcases/*.json`.
