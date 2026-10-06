# OrangeHRM Automation – Employee Lifecycle & Role-Based Access (Playwright Test)

End-to-end **UI + API** automation for the [OrangeHRM demo site](https://opensource-demo.orangehrmlive.com/), written in
**JavaScript with Playwright Test**: Page Object Model, custom fixtures, API-seeded test data, independent and fully
parallel tests, role-based access checks, JSON-schema validated API responses, and a sharded CI pipeline.

---

## What is tested

18 tests (6 spec files). Employee tests are data-driven: one test per row of `test-data/employees.json`.

| Spec                  | Test                                                                    | Data set up by (fixture)                       | Verifies                                                                                       |
| --------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `auth/login`          | Valid credentials open the dashboard                                    | – (logged-out context)                         | Dashboard URL, header, widgets                                                                 |
| `auth/login`          | Invalid credentials are rejected                                        | –                                              | "Invalid credentials", stays on login                                                          |
| `auth/login`          | Logout invalidates the session                                          | own UI login                                   | API accepts session → logout → API rejects the old cookie, protected page redirects to login   |
| `pim/employee-create` | Admin creates an employee with a profile picture                        | `employeeData` (generated) + `employeeCleanup` | Picture preview, "Successfully Saved", profile header, API returns it (schema + values)        |
| `pim/employee-update` | Admin updates Job Title & Employment Status                             | `employee` (API) + `jobReference`              | Toast, values persist after reload, Employee List row, job-details API                         |
| `pim/employee-api`    | Search + job-details APIs return the seeded record                      | `employeeWithJob` (API)                        | **Pure API test, no browser**: schema + values                                                 |
| `pim/employee-api`    | Employee List UI matches API and test data                              | `employeeWithJob` (API)                        | Three-way UI ↔ API ↔ test-data check                                                           |
| `pim/employee-delete` | Admin deletes an employee                                               | `employee` (API)                               | Toast, "No Records Found", API no longer returns it, `GET /pim/employees/{n}` fails            |
| `rbac/role-access`    | Admin sees the PIM and Admin modules                                    | Admin session                                  | Positive control for the ESS checks                                                            |
| `rbac/role-access`    | ESS user only sees self-service modules                                 | `essUser` (API)                                | Admin + PIM hidden, Dashboard + My Info shown                                                  |
| `rbac/role-access`    | ESS user is denied Admin > User Management / PIM > Employee List by URL | `essUser`                                      | "Credential Required"                                                                          |
| `rbac/role-access`    | ESS user cannot read admin data or delete employees through the API     | `essUser` + `employee`                         | `/admin/users` → 403, other employee not visible, delete refused **and** employee still exists |

---

## Architecture

```
.
├── config/
│   ├── index.js                  # loads .env/.env.<TEST_ENV>, selects the environment, validates it
│   ├── constants.js              # ALL timeouts, UI messages, routes, URL patterns, role ids, tags
│   └── environments/             # one file per environment: demo.js, qa.js, staging.js
├── api/
│   ├── apiClient.js              # APIRequestContext wrapper: never throws on HTTP errors, logs every call
│   ├── auth.js                   # API login (CSRF token + form POST) used to build storageState
│   ├── index.js                  # OrangeHrmApi facade: api.employees.*, api.admin.*, OrangeHrmApi.forPage(page)
│   ├── endpoints/                # employeesApi.js (PIM), adminApi.js (users, job titles, statuses)
│   └── schemas/                  # JSON schemas for the responses the tests rely on (validated with ajv)
├── fixtures/
│   ├── index.js                  # test.extend: auth, apiClient, data, cleanup, ESS user, page objects
│   └── matchers.js               # expect(...).toMatchSchema('employeeList')
├── pages/                        # Page Object Model - one class per screen, injected by fixtures
│   ├── BasePage.js
│   ├── components/OxdComponents.js   # OrangeHRM widget helpers: labelled fields, selects, toasts, loaders
│   ├── LoginPage.js  DashboardPage.js  NavigationBar.js
│   └── AddEmployeePage.js  EmployeeListPage.js  EmployeeDetailsPage.js
├── tests/
│   ├── auth/login.spec.js
│   ├── pim/employee-{create,update,api,delete}.spec.js
│   └── rbac/role-access.spec.js
├── utils/
│   ├── logger.js                 # structured JSON-lines logger, attached to every test in the report
│   └── testData.js               # random names, unique Employee IDs, ESS credentials, data-row filter
├── test-data/                    # employees.json + profile pictures
├── scripts/                      # report-summary.js (CI job summary), collect/clean artifacts
├── .github/workflows/e2e.yml     # lint → 3 sharded test jobs → merged report → GitHub Pages
├── eslint.config.js  .prettierrc.json  jsconfig.json
└── playwright.config.js
```

### Design decisions

- **Fixtures do all setup and teardown.** Specs never log in through the API, create data or construct page objects
  themselves; they ask for what they need (`async ({ employee, employeeListPage }) => …`) and the fixture creates it
  before the test and removes it afterwards, **even when the test fails**. See the header of `fixtures/index.js` for
  the full list.
- **Authentication via storageState, once per worker.** The worker fixture `adminStorageState` logs in as Admin
  through the API (reading the login page's CSRF token) and saves `.auth/admin-worker-<n>.json`. Every browser
  context starts already logged in, so only the login tests use the login form. Each worker has **its own** server
  session, so a test that logs out cannot break tests running in other workers.
- **Data set up through the API, behaviour tested through the UI.** For example, the delete test does not create its
  employee by clicking through Add Employee. It gets one from the `employee` fixture (`POST /api/v2/pim/employees`),
  so a bug in the create form only fails the create test.
- **Page objects are classes injected as fixtures**, all derived from `BasePage`. Adding a screen means one class and
  one fixture line, and `page`/`baseURL` are never passed around by hand.
- **User-facing locators.** `getByRole`, `getByPlaceholder`, `getByText` and `getByAltText` replace the old XPath.
  OrangeHRM's `<label>` elements are not linked to their inputs, so `getByLabel` cannot find them. Instead,
  `OxdComponents.field('Employee Id')` finds the input group containing that visible label and uses a role locator
  inside it. CSS classes are used only where the widget has no role or name (loaders, toasts, the custom select box,
  icon-only buttons).
- **No hard-coded values.** Timeouts, messages, routes and role ids live in `config/constants.js`; URLs in
  `config/environments/*`; credentials only in `.env` or CI secrets. Invalid passwords and ESS credentials are generated.
- **Errors are never swallowed.** The API client returns `{ status, body }` and `ensureOk()` throws a descriptive
  error. Teardown problems are logged as warnings and added to the report as a `cleanup warning` annotation.

---

## How the tests are kept independent

The original suite was one 120-line test of six dependent `test.step`s: if step 2 failed, steps 3–6 never ran, and the
employee was never deleted. Now:

1. **Each test owns its data.** Every test gets a freshly generated employee (random name, random 7-digit Employee ID)
   from fixtures. No test reads anything another test created, and no test depends on run order.
2. **Preconditions come from the API, not from earlier tests.** "Update" and "delete" need an existing employee: the
   `employee` fixture creates one through the API. "API verification" needs job details: `employeeWithJob` sets them
   through the API.
3. **Cleanup always runs.** `employeeCleanup` tracks every Employee ID a test creates, through the API or the UI, and
   deletes whatever still exists in teardown. The ID is registered _before_ creation, so a half-finished setup is
   cleaned up too. The `essUser` fixture deletes its user and its employee.
4. **Environment reference data is guaranteed.** `jobReference` looks up the job title and employment status from the
   data row and creates them if the environment doesn't have them. That data is shared and reusable, so it isn't
   deleted afterwards.
5. **Sessions are isolated.** Admin tests share a per-worker storageState. Login, logout and ESS tests opt out with
   `test.use({ storageState: LOGGED_OUT })` and get their own session, so logging out never affects another test.
6. **Proof:** `fullyParallel: true`, with tests spread across workers and CI shards in any order. `npm run
test:flaky-check` (`--repeat-each=5`) runs each test five times in parallel with itself.

You can run any single test on its own, e.g. `npx playwright test -g "deletes an employee"`.

---

## Setup

```bat
cd /d "C:\path\to\project"
node -v                          :: v20 or higher
npm install
npx playwright install chromium
copy .env.example .env           :: macOS/Linux: cp .env.example .env
```

| Variable                                      | Default                                  | Meaning                                                                                  |
| --------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `TEST_ENV`                                    | `demo`                                   | `demo` / `qa` / `staging` → `config/environments/<name>.js` (+ `.env.<name>` if present) |
| `ORANGEHRM_USERNAME` / `ORANGEHRM_PASSWORD`   | –                                        | Admin credentials (required)                                                             |
| `BASE_URL`, `QA_BASE_URL`, `STAGING_BASE_URL` | from env file                            | URL overrides                                                                            |
| `WORKERS`                                     | env file (demo: 4 local, 2 per CI shard) | Parallel workers                                                                         |
| `HEADLESS`                                    | `true`                                   | `false` shows the browser                                                                |
| `VIDEO`                                       | `on` locally, `retain-on-failure` in CI  | Playwright video mode                                                                    |
| `KEEP_TRACE`                                  | `false`                                  | `true` keeps traces for passed tests too                                                 |
| `LOG_LEVEL`                                   | `warn`                                   | Console level of the structured log (`debug` prints every API call)                      |
| `EMPLOYEE_KEY`                                | _(empty)_                                | Run only one row of `employees.json`                                                     |
| `BROWSERS`                                    | _(chromium)_                             | `all` adds Firefox and WebKit projects                                                   |
| `FAIL_ON_FLAKY`                               | `false`                                  | `true` fails the run if any test only passed on retry                                    |
| `RUN_QUARANTINED`                             | `false`                                  | `true` includes `@quarantine` tests                                                      |

---

## Running

```bat
npm test                    :: everything, in parallel, headless
npm run test:headed
npm run test:smoke          :: @smoke   - login/logout
npm run test:regression     :: @regression
npm run test:api            :: @api     - API-level checks
npm run test:rbac           :: @rbac    - role-based access
npm run test:p1             :: @p1      - highest priority only
npm run test:qa             :: TEST_ENV=qa   (also test:demo, test:staging)
npm run test:all-browsers   :: chromium + firefox + webkit
npm run test:flaky-check    :: every test 5x, no retries
npm run report              :: open the last HTML report
npm run lint / format:check / typecheck
```

### Tagging strategy

| Tag            | Meaning                                                          |
| -------------- | ---------------------------------------------------------------- |
| `@smoke`       | Fast checks that must pass on every deploy                       |
| `@regression`  | Full functional coverage                                         |
| `@ui` / `@api` | Layer under test (an `@api` test without `@ui` opens no browser) |
| `@rbac`        | Role-based access control                                        |
| `@p1` / `@p2`  | Priority: `@p1` blocks a release, `@p2` doesn't                  |
| `@quarantine`  | Known-flaky, excluded by default (see below)                     |

---

## CI/CD (`.github/workflows/e2e.yml`)

1. **static-checks** – `npm ci`, ESLint, Prettier, `tsc` type check (JSDoc `// @ts-check`), `playwright test --list`.
2. **e2e** – 3 parallel shards (`--shard=i/3`), each with the environment's CI worker count. Uploads a blob report,
   and also videos, traces and screenshots when tests fail.
3. **report** – merges the shard blob reports into one HTML + JSON report, writes a pass/fail/flaky table to the
   **job summary**, and uploads the HTML report.
4. **deploy-report** – on `main`, publishes the merged report to **GitHub Pages**.

Triggers: push to `main`, pull requests, and manual runs (pick the environment and an optional `--grep`).
Credentials come only from the `ORANGEHRM_USERNAME` / `ORANGEHRM_PASSWORD` secrets, with no fallback values, and the
job fails early if they are missing. Each target environment can be a GitHub environment (`demo`, `qa`, `staging`) with
its own secrets and `BASE_URL` / `QA_BASE_URL` / `STAGING_BASE_URL` variables. To publish to Pages, set
**Settings → Pages → Source** to **GitHub Actions**.

---

## Reports & observability

| Artifact           | Where                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| HTML report        | `playwright-report/` (`npm run report`); in CI the merged report artifact and GitHub Pages                    |
| Steps              | Every test is split into named `test.step`s                                                                   |
| Annotations        | Generated test data, ESS username, UI row, API payload, cleanup warnings                                      |
| Structured log     | `test-log.jsonl` attached to each test: every API call (method, path, status, duration), seeding and teardown |
| Screenshot / trace | Kept for failed tests (`test-results/<test>/`)                                                                |
| Video              | Every test locally; failures only in CI                                                                       |
| CI job summary     | Pass / fail / flaky counts and lists                                                                          |

Run output is not committed (`playwright-report/`, `test-results/` and `test-artifacts/` are git-ignored). The report of
every CI run is published to GitHub Pages and attached to the run as an artifact. To keep a local copy of a run's report
and videos, use `npm run artifacts:collect` (copies them into `test-artifacts/`).

---

## Flaky test strategy

The demo site is public and shared, so it is slow at times and its data changes underneath us. Most flakiness comes
from three sources: timing, shared data and shared sessions. The suite is built to remove those causes, and the
process below catches what remains.

### Prevention (built in)

- **Isolated data:** every test creates its own uniquely named data through the API and deletes it afterwards. No
  test depends on another test or on pre-existing records. Missing reference data (job titles, statuses) is created
  on demand.
- **Isolated sessions:** one server session per worker; tests that log in or out use their own session.
- **No hard waits:** only web-first assertions and auto-waiting. The code explicitly waits for OrangeHRM's loaders,
  and the Employee List search waits for the slow full list _and_ for its own `/api/v2/pim/employees` response. That
  avoids a race where the full list arrives after the search result and overwrites it.
- **Retry-until-stable input:** the Employee ID field is filled with `expect(...).toPass()` because OrangeHRM fills
  it asynchronously and could overwrite our value.
- **Generous, central timeouts** in `config/constants.js`, tuned for the slow demo.
- **API setup instead of UI setup** shortens the UI path each test depends on.

### Detection

- **Retries + flaky status:** CI retries failed tests twice. A test that passes on retry is reported as **flaky**, not
  passed, and is listed in the CI job summary and the HTML report.
- **Stress run:** `npm run test:flaky-check` runs every test 5 times in parallel with no retries. Run it before
  merging new tests. Use `npx playwright test -g "<title>" --repeat-each=20` to hammer a single test.
- **Strict mode:** `FAIL_ON_FLAKY=true` makes a run fail when anything is flaky. Use it on a branch while fixing.
- **History:** flaky lists from the job summaries over time show which tests are chronic. Traces of retried tests
  (`retain-on-failure`) show what differed between the attempts.

### Mitigation

1. Open the trace of the failed attempt and find the root cause (timing, data, environment).
2. Fix it in the page object or fixture, for example a missing wait for a loader or a response, or shared data.
3. If it can't be fixed right away, **quarantine** it: add the `@quarantine` tag and open an issue. Quarantined tests
   are excluded by default (`grepInvert`), so they don't block the pipeline, and they can still be run on their own
   with `npm run test:quarantine`.
4. Remove the tag once `--repeat-each=20` passes cleanly.

---

## Test data management

- `test-data/employees.json` holds the data rows (job title, employment status, picture, Employee ID prefix). Every
  employee test runs once per row; `EMPLOYEE_KEY` selects one row.
- Names are random (`utils/testData.js`) and Employee IDs are random 7-digit numbers with the row prefix, so parallel
  workers can't collide.
- Employees and ESS users are created through the API and deleted in fixture teardown, including after failures.
- Job titles and employment statuses are created if missing (`AdminApi.ensureJobTitle` / `ensureEmploymentStatus`).

---

## Troubleshooting

| Problem                      | Check                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `Missing credentials`        | `.env` exists and has `ORANGEHRM_USERNAME` / `ORANGEHRM_PASSWORD`                             |
| `API login failed`           | Credentials are correct and the site is reachable in a browser                                |
| `Unknown TEST_ENV`           | Use one of the files in `config/environments/`                                                |
| Timeouts on the demo site    | The public demo is shared and sometimes slow. Lower `WORKERS` (e.g. `set WORKERS=2`) or rerun |
| `cleanup warning` annotation | Teardown couldn't delete a record; the warning names it                                       |
| A test fails                 | `npm run report` → open the test → steps, `test-log.jsonl`, screenshot, video and trace       |
