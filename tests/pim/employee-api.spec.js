// @ts-check
const { test, expect } = require('../../fixtures');
const { TAGS } = require('../../config/constants');
const { employeeRows } = require('../../utils/testData');

for (const row of employeeRows()) {
  test.describe(`PIM - API verification [${row.key}]`, { tag: [TAGS.regression, TAGS.api] }, () => {
    test.use({ employeeRow: row });

    // Pure API test - no browser is opened. Precondition: employee + job details seeded via the API.
    test(
      'Employee search and job-details APIs return the seeded record',
      { tag: [TAGS.p1] },
      async ({ employeeWithJob: employee, apiClient }) => {
        await test.step('Search by Employee Id returns exactly one valid record', async () => {
          const response = await apiClient.employees.search(employee.employeeId);
          expect(response.status).toBe(200);
          expect(response.body).toMatchSchema('employeeList');

          const matches = response.body.data.filter(
            (/** @type {{ employeeId: string }} */ e) => e.employeeId === employee.employeeId
          );
          expect(matches, `API should return exactly one employee "${employee.employeeId}"`).toHaveLength(1);
          expect(matches[0]).toMatchObject({
            empNumber: employee.empNumber,
            firstName: employee.firstName,
            lastName: employee.lastName,
            jobTitle: { title: employee.job.jobTitle },
            empStatus: { name: employee.job.employmentStatus },
          });
        });

        await test.step('job-details returns the seeded Job Title and Employment Status', async () => {
          const response = await apiClient.employees.getJobDetails(employee.empNumber);
          expect(response.status).toBe(200);
          expect(response.body).toMatchSchema('jobDetails');
          expect(response.body.data).toMatchObject({
            empNumber: employee.empNumber,
            jobTitle: { id: employee.job.jobTitleId, title: employee.job.jobTitle },
            empStatus: { id: employee.job.empStatusId, name: employee.job.employmentStatus },
          });
        });
      }
    );

    // UI <-> API <-> test data three-way check on the same API-seeded record.
    test(
      'Employee List UI matches the API and the test data',
      { tag: [TAGS.ui, TAGS.p2] },
      async ({ employeeWithJob: employee, apiClient, employeeListPage }) => {
        const uiRow = await test.step('Read the employee row from the Employee List', async () => {
          await employeeListPage.open();
          await employeeListPage.searchByEmployeeId(employee.employeeId);
          await employeeListPage.expectSingleResult(employee.employeeId);
          const row = await employeeListPage.getRowData(employee.employeeId);
          test.info().annotations.push({ type: 'UI row', description: JSON.stringify(row) });
          return row;
        });

        const apiEmployee = await test.step('Read the same employee from the API', async () => {
          const [match] = await apiClient.employees.findByEmployeeId(employee.employeeId);
          test.info().annotations.push({ type: 'API employee', description: JSON.stringify(match) });
          return match;
        });

        await test.step('UI, API and test data agree', async () => {
          expect(apiEmployee.empNumber, 'API empNumber should match the seeded employee').toBe(employee.empNumber);
          expect(uiRow['Id'], 'UI Id should match the API').toBe(apiEmployee.employeeId);
          expect(uiRow['Last Name'], 'UI Last Name should match the API').toBe(apiEmployee.lastName);
          expect(apiEmployee.lastName, 'API lastName should match the test data').toBe(employee.lastName);
          expect(uiRow['First (& Middle) Name'], 'UI first name should start with the API firstName').toMatch(
            new RegExp(`^${apiEmployee.firstName}\\b`)
          );
          expect(apiEmployee.firstName, 'API firstName should match the test data').toBe(employee.firstName);
          expect(uiRow['Job Title'], 'UI Job Title should match the API').toBe(apiEmployee.jobTitle.title);
          expect(uiRow['Employment Status'], 'UI Employment Status should match the API').toBe(
            apiEmployee.empStatus.name
          );
          expect(apiEmployee.jobTitle.title, 'API Job Title should match the test data').toBe(employee.job.jobTitle);
        });
      }
    );
  });
}
