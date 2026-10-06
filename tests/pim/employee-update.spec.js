// @ts-check
const { test, expect } = require('../../fixtures');
const { TAGS } = require('../../config/constants');
const { employeeRows } = require('../../utils/testData');

for (const row of employeeRows()) {
  test.describe(`PIM - update employee [${row.key}]`, { tag: [TAGS.regression, TAGS.ui] }, () => {
    test.use({ employeeRow: row });

    // Precondition (fixtures): a fresh employee created through the API, and the job title /
    // employment status from the data row guaranteed to exist. Both are cleaned up / reusable.
    test(
      'Admin updates Job Title and Employment Status',
      { tag: [TAGS.p1] },
      async ({ employee, jobReference, employeeListPage, employeeDetailsPage, apiClient }) => {
        const { jobTitle, employmentStatus } = jobReference;

        await test.step('Find the employee by Employee Id and open the profile', async () => {
          await employeeListPage.open();
          await employeeListPage.searchByEmployeeId(employee.employeeId);
          await employeeListPage.expectSingleResult(employee.employeeId);
          await employeeListPage.openEmployee(employee.employeeId);
          await employeeDetailsPage.expectEmployeeName(employee);
        });

        await test.step('Update the job details and confirm they persist after reload', async () => {
          await employeeDetailsPage.openJobTab();
          await employeeDetailsPage.updateJobDetails({ jobTitle, employmentStatus });
          await employeeDetailsPage.expectPersistedJobDetails({ jobTitle, employmentStatus });
        });

        await test.step('The Employee List shows the new values', async () => {
          await employeeListPage.open();
          await employeeListPage.searchByEmployeeId(employee.employeeId);
          await employeeListPage.expectSingleResult(employee.employeeId);
          const uiRow = await employeeListPage.getRowData(employee.employeeId);
          test.info().annotations.push({ type: 'UI row', description: JSON.stringify(uiRow) });

          expect(uiRow['Job Title'], 'Employee List should show the updated Job Title').toBe(jobTitle);
          expect(uiRow['Employment Status'], 'Employee List should show the updated Employment Status').toBe(
            employmentStatus
          );
        });

        await test.step('The job-details API returns the new values', async () => {
          const response = await apiClient.employees.getJobDetails(employee.empNumber);
          expect(response.status).toBe(200);
          expect(response.body).toMatchSchema('jobDetails');
          expect(response.body.data.jobTitle.title, 'API Job Title').toBe(jobTitle);
          expect(response.body.data.empStatus.name, 'API Employment Status').toBe(employmentStatus);
        });
      }
    );
  });
}
