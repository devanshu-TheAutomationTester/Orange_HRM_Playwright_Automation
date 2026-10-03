# OrangeHRM UI Automation – Employee Lifecycle (Playwright Test)

End-to-end UI + API automation for the [OrangeHRM demo site](https://opensource-demo.orangehrmlive.com/),
written in **JavaScript with Playwright Test** using the **Page Object Model**.

It automates the **Employee Lifecycle Management** scenario from the QA Automation technical assessment:

| # | Step | What is verified |
|---|------|------------------|
| 1 | **Login** (Admin / admin123 from `.env`) | Redirect to the dashboard, "Dashboard" header and widgets visible |
| 2 | **Add employee** via PIM > Add Employee, data-driven from `test-data/employees.json` – random First Name + Last Name, Employee ID and profile picture | Picture preview loaded, "Successfully Saved" toast, profile page shows the new name, API returns the record with the same `empNumber` |
| 3 | **Edit employee** – search by Employee ID, open it, update Job Title + Employment Status | "Successfully Updated" toast, values persist after reload, Employee List row shows the new values |
| 4 | **Validate via API** (OrangeHRM REST API v2) | `GET /api/v2/pim/employees` and `/job-details` match the test data **and** the values read from the UI |
| 5 | **Delete employee** from the Employee List | "Successfully Deleted" toast, search shows "No Records Found", API no longer returns it, `GET /pim/employees/{empNumber}` fails |
| 6 | **Logout** | Login page shown, API rejects the old session, protected page redirects to login |

Every test is **video-recorded** and the run produces Playwright's **HTML report** (with steps, videos, screenshots and traces).

---

## Tech stack & dependencies

| Package | Purpose |
|---|---|
| `@playwright/test` | Test runner, assertions, browser automation (Chromium), HTML report, video, trace |
| `dotenv` | Loads credentials/config from `.env` |

Node.js **20+** is required.

---

## Project structure

```
.
├── tests/
│   ├── employeeLifecycle.spec.js   # the 6-step E2E scenario (data-driven, one test per data row)
│   └── login.spec.js               # smoke: valid + invalid login
├── pages/                          # Page Object Model - one plain module per screen, no classes
│   ├── loginPage.js
│   ├── dashboardPage.js
│   ├── headerPage.js               # side menu, top navigation, logout
│   ├── addEmployeePage.js
│   ├── employeeListPage.js         # search, read a row by column name, delete
│   └── employeeDetailsPage.js      # profile header + Job tab
├── test-data/
│   ├── employees.json              # test data
│   └── images/                     # profile pictures to upload
├── utils/
│   ├── oxdHelpers.js               # shared widgets: labelled inputs, dropdowns, toasts, loaders
│   ├── orangeHrmApi.js             # OrangeHRM REST API v2 calls (share the browser session)
│   └── testData.js                 # random employee names, unique Employee ID, data row filter
├── scripts/
│   ├── collect-artifacts.js        # copies report + videos into test-artifacts/ for committing
│   └── clean-artifacts.js          # deletes test-results/ and playwright-report/
├── ci/e2e.yml                      # GitHub Actions workflow (move to .github/workflows/)
├── playwright.config.js            # runner configuration
├── .env.example                    # template for .env
├── package.json / package-lock.json
└── README.md
```

### Design notes

- **Page Object Model, kept flat** – specs contain only the flow and assertions; locators and screen actions live in
  `pages/`. Every page module is a plain object, not a class: locator strings are exported as data
  (`loginPage.username`), and actions are plain `async` functions that take `page` as their first argument
  (`await loginPage.login(page, username, password)`). No constructors, no fixture injection - a spec file just
  `require`s the modules it needs and calls them directly.
- **Readable report** – each scenario step is a `test.step(...)`, so the HTML report shows steps 1–6 individually.
- **Simple, static XPath locators** – every page file starts with a `locators` object holding plain XPath strings,
  e.g. `employeeId: '//label[normalize-space()="Employee Id"]/../following-sibling::div/input'`. No XPath is built
  at runtime; where a value varies (an employee's row, a dropdown option) the fixed XPath is narrowed with Playwright's
  `.filter({ hasText })`. Table cells are mapped to column header names instead of positions. No hard-coded waits
  (Playwright auto-waiting + explicit waits for OrangeHRM loaders/toasts).
- **Data-driven** – one test is generated per row of `employees.json`. On every run each employee gets a **random
  first and last name** (from the lists in `utils/testData.js`) and a unique Employee ID (max 10 chars), so tests can
  be repeated on the shared demo site. The generated name and ID appear as an annotation in the HTML report.
- **UI ↔ API consistency** – `utils/orangeHrmApi.js` uses `page.request`, which shares the browser's cookies, so the
  API calls run as the logged-in user; after logout the same call proves the session is invalidated.
- **Descriptive assertions** – every `expect` has a custom message, e.g.
  `expect(apiEmployee.jobTitle?.title, 'API Job Title should match the UI').toBe(uiRow['Job Title'])`.
- **No credentials in code** – read from `.env`.

---

## Setup (Windows cmd)

```bat
cd /d "C:\path\to\project"
node -v                          :: must be v20 or higher
npm install
npx playwright install chromium
copy .env.example .env
```

macOS / Linux: same commands, with `cp .env.example .env` (and `npx playwright install --with-deps chromium` on Linux).

| `.env` variable | Default | Meaning |
|---|---|---|
| `BASE_URL` | `https://opensource-demo.orangehrmlive.com/web/index.php` | App URL |
| `ORANGEHRM_USERNAME` / `ORANGEHRM_PASSWORD` | `Admin` / `admin123` | Login credentials |
| `HEADLESS` | `true` | `false` shows the browser |
| `KEEP_TRACE` | `false` | `true` keeps traces for passed tests too |
| `EMPLOYEE_KEY` | *(empty)* | Run only one row of `employees.json` |
| `STEP_PAUSE` | `0` | Pause (ms) between the six lifecycle scenario steps (optional, not in `.env.example`) |
| `CHROMIUM_PATH` | *(empty)* | Use an already-installed Chromium instead of Playwright's download (optional) |

When `CI` is set (as in the GitHub Actions workflow), failed tests are retried once and `test.only` fails the run.

---

## Running the tests

```bat
npm test                  :: all tests, headless
npm run test:headed       :: all tests, browser visible
npm run test:lifecycle    :: only the Employee Lifecycle scenario
npm run test:smoke        :: only @smoke (login) tests
npm run test:debug        :: step through with the Playwright Inspector
npm run report            :: open the HTML report of the last run
npm run artifacts:collect :: copy report + videos into test-artifacts/
npm run clean:artifacts   :: delete test-results/ and playwright-report/
```

Plain Playwright commands also work:

```bat
npx playwright test tests/employeeLifecycle.spec.js --headed
npx playwright test --grep @lifecycle
npx playwright show-report
```

### Slower, easy-to-follow runs

Runs are not slowed down by default. To follow the lifecycle scenario on screen or in the video, set `STEP_PAUSE`
(milliseconds) to add a pause after each of the six steps:

```bat
set STEP_PAUSE=2000
npx playwright test tests/employeeLifecycle.spec.js --headed
```

Run a single data row (cmd):

```bat
set EMPLOYEE_KEY=qa-engineer-permanent
npm run test:lifecycle
```

### Adding test data

Add an object to `test-data/employees.json`:

```json
{
  "key": "my-new-case",
  "middleName": "",
  "employeeIdPrefix": "JD",
  "profilePicture": "test-data/images/profile-1.png",
  "update": { "jobTitle": "QA Lead", "employmentStatus": "Part-Time Contract" }
}
```

First and last names are not set here – they are generated randomly on every run (edit `FIRST_NAMES` / `LAST_NAMES`
in `utils/testData.js` to change them). `jobTitle` / `employmentStatus` must exist in the demo's dropdowns (e.g. *QA Engineer*, *Software Engineer*, *QA Lead*;
*Full-Time Permanent*, *Full-Time Probation*, *Part-Time Contract*, *Freelance*). Pictures: JPG/PNG/GIF under 1 MB.

---

## Reports, video and traces

| Artifact | Location |
|---|---|
| HTML report | `playwright-report/index.html` (`npm run report`) |
| Video of every test | `test-results/<test>/video.webm` (also embedded in the HTML report) |
| Screenshot on failure | `test-results/<test>/test-failed-1.png` |
| Trace on failure | `test-results/<test>/trace.zip` → `npx playwright show-trace <file>` |

### Committing the report and video

`playwright-report/` and `test-results/` are git-ignored because they change on every run. To include the evidence
of a run in the repository:

```bat
npm test
npm run artifacts:collect
git add test-artifacts
git commit -m "Add test execution report and videos"
```

This creates `test-artifacts/html-report/` (open `index.html`) and `test-artifacts/videos/*.webm`.

---

## CI (GitHub Actions)

Move `ci/e2e.yml` to `.github/workflows/e2e.yml`:

```bat
mkdir .github\workflows
move ci\e2e.yml .github\workflows\e2e.yml
```

The workflow runs on pushes to `main`, pull requests and manually, installs Chromium, runs the suite headless and uploads
the HTML report and videos/traces as build artifacts.

---

## Troubleshooting

| Problem | Check |
|---|---|
| `Executable doesn't exist` | `npx playwright install chromium` |
| `Missing credentials` | `.env` exists (`copy .env.example .env`) |
| Timeouts on the demo site | The public demo is shared and sometimes slow – rerun |
| Dropdown option not found | Demo master data changed – use values that exist and update `employees.json` |
| A step fails | Open the HTML report (`npm run report`): it shows the failing step, screenshot, video and trace |

Employees created by an interrupted run may stay on the demo until it is reset, but every run uses a new Employee ID,
so runs never clash.
