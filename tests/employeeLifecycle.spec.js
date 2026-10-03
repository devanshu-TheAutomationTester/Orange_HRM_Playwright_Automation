const { test, expect } = require('@playwright/test');

const loginPage = require('../pages/loginPage');
const dashboardPage = require('../pages/dashboardPage');
const headerPage = require('../pages/headerPage');
const addEmployeePage = require('../pages/addEmployeePage');
const employeeListPage = require('../pages/employeeListPage');
const employeeDetailsPage = require('../pages/employeeDetailsPage');
const api = require('../utils/orangeHrmApi');
const { employeeRows, buildEmployee } = require('../utils/testData');

// Pause between scenario steps when watching the run (STEP_PAUSE, set automatically in headed mode). 
const STEP_PAUSE = Number(process.env.STEP_PAUSE || 0);

/** test.step + a short, visible pause afterwards so each step is easy to follow on screen/video. */
async function step(title, body) {
  await test.step(title, body);
  if (STEP_PAUSE > 0) await new Promise((resolve) => setTimeout(resolve, STEP_PAUSE));
}

/*
 * Scenario: Employee Lifecycle Management.
 * Data-driven - one test per row in test-data/employees.json
 * (run a single row with EMPLOYEE_KEY=<key>, see README).
 */
test.describe('PIM - Employee Lifecycle Management', { tag: '@e2e' }, () => {
  for (const row of employeeRows()) {
    test(`Verify employee lifecycle - ${row.key}`, { tag: '@lifecycle' }, async ({ page, baseURL }) => {
      const employee = buildEmployee(row);
      const { jobTitle, employmentStatus } = employee.update;
      test.info().annotations.push({
        type: 'test data',
        description: `${employee.firstName} ${employee.lastName} - Employee Id ${employee.employeeId}`,
      });

      let empNumber;
      let uiRow;

      await step('1. Login with valid credentials and verify the dashboard', async () => {
        await loginPage.login(page);
        await dashboardPage.expectDashboard(page);
      });

      await step('2. PIM > Add Employee - create the employee with a profile picture', async () => {
        await headerPage.openPim(page);
        await headerPage.openAddEmployee(page);
        empNumber = await addEmployeePage.createEmployee(page, employee);
        await employeeDetailsPage.expectEmployeeProfile(page, employee);

        const [created] = await api.findEmployeesByEmployeeId(page, baseURL, employee.employeeId);
        expect(created, `API should return the new employee with Employee Id "${employee.employeeId}"`).toBeTruthy();
        expect(created.empNumber, 'API empNumber should match the one in the profile URL').toBe(empNumber);
      });

      await step('3. Search by Employee Id and update Job Title + Employment Status', async () => {
        await headerPage.openEmployeeList(page);
        await employeeListPage.searchByEmployeeId(page, employee.employeeId);
        await employeeListPage.expectSingleResult(page, employee.employeeId);
        await employeeListPage.openEmployee(page, employee.employeeId);
        await employeeDetailsPage.expectEmployeeProfile(page, employee);

        await employeeDetailsPage.openJobTab(page);
        await employeeDetailsPage.updateJobDetails(page, { jobTitle, employmentStatus });
        await employeeDetailsPage.expectPersistedJobDetails(page, { jobTitle, employmentStatus });

        await headerPage.openEmployeeList(page);
        await employeeListPage.searchByEmployeeId(page, employee.employeeId);
        await employeeListPage.expectSingleResult(page, employee.employeeId);
        uiRow = await employeeListPage.getRowData(page, employee.employeeId);
        test.info().annotations.push({ type: 'UI row', description: JSON.stringify(uiRow) });

        expect(uiRow['Id'], 'Employee List should show the searched Employee Id').toBe(employee.employeeId);
        expect(uiRow['Last Name'], 'Employee List should show the last name').toBe(employee.lastName);
        expect(uiRow['Job Title'], 'Employee List should show the updated Job Title').toBe(jobTitle);
        expect(uiRow['Employment Status'], 'Employee List should show the updated Employment Status').toBe(
          employmentStatus
        );
      });

      await step('4. Validate the employee via the OrangeHRM API and cross-check with the UI', async () => {
        const matches = await api.findEmployeesByEmployeeId(page, baseURL, employee.employeeId);
        expect(matches, `API should return exactly one employee with Employee Id "${employee.employeeId}"`).toHaveLength(
          1
        );
        const apiEmployee = matches[0];
        test.info().annotations.push({ type: 'API employee', description: JSON.stringify(apiEmployee) });

        // API vs test data
        expect(apiEmployee.empNumber, 'API empNumber should match the employee created in the UI').toBe(empNumber);
        expect(apiEmployee.firstName, 'API firstName should match the test data').toBe(employee.firstName);
        expect(apiEmployee.lastName, 'API lastName should match the test data').toBe(employee.lastName);

        // API vs UI
        expect(apiEmployee.employeeId, 'API employeeId should match the Id shown in the UI').toBe(uiRow['Id']);
        expect(apiEmployee.lastName, 'API lastName should match the Last Name shown in the UI').toBe(
          uiRow['Last Name']
        );
        expect(
          uiRow['First (& Middle) Name'].startsWith(apiEmployee.firstName),
          `UI first name "${uiRow['First (& Middle) Name']}" should start with API firstName "${apiEmployee.firstName}"`
        ).toBe(true);
        expect(apiEmployee.jobTitle?.title, 'API Job Title should match the UI').toBe(uiRow['Job Title']);
        expect(apiEmployee.empStatus?.name, 'API Employment Status should match the UI').toBe(
          uiRow['Employment Status']
        );

        const jobDetails = await api.getJobDetails(page, baseURL, empNumber);
        expect(jobDetails.status, `GET job-details for empNumber ${empNumber} should return HTTP 200`).toBe(200);
        expect(jobDetails.body.data.jobTitle?.title, 'job-details API should return the updated Job Title').toBe(
          jobTitle
        );
        expect(
          jobDetails.body.data.empStatus?.name,
          'job-details API should return the updated Employment Status'
        ).toBe(employmentStatus);
      });

      await step('5. Delete the employee and verify via UI and API', async () => {
        // Fresh search so the row is guaranteed to be on screen before deleting it.
        await employeeListPage.searchByEmployeeId(page, employee.employeeId);
        await employeeListPage.expectSingleResult(page, employee.employeeId);
        await employeeListPage.deleteEmployee(page, employee.employeeId);
        await employeeListPage.searchByEmployeeId(page, employee.employeeId);
        await employeeListPage.expectNoRecords(page, employee.employeeId);

        const remaining = await api.findEmployeesByEmployeeId(page, baseURL, employee.employeeId);
        expect(remaining, `API should no longer return Employee Id "${employee.employeeId}"`).toHaveLength(0);
        const deleted = await api.getEmployee(page, baseURL, empNumber);
        expect(deleted.status, `GET /pim/employees/${empNumber} should fail after deletion`).not.toBe(200);
      });

      await step('6. Logout and verify the session is invalidated', async () => {
        await headerPage.logout(page);
        await loginPage.expectLoginPage(page);

        const afterLogout = await api.get(page, baseURL, '/pim/employees?limit=1');
        expect(
          afterLogout.status,
          `API should reject the old session after logout (got HTTP ${afterLogout.status})`
        ).not.toBe(200);

        // A protected page must send the user back to the login screen.
        await page.goto('pim/viewEmployeeList');
        await loginPage.expectLoginPage(page);
      });
    });
  }
});
