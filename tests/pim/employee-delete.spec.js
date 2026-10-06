// @ts-check
const { test, expect } = require('../../fixtures');
const { TAGS } = require('../../config/constants');
const { employeeRows } = require('../../utils/testData');

for (const row of employeeRows()) {
  test.describe(`PIM - delete employee [${row.key}]`, { tag: [TAGS.regression, TAGS.ui] }, () => {
    test.use({ employeeRow: row });

    // Precondition: a fresh employee created through the API. If this test fails before the
    // delete, the fixture's teardown removes the employee instead.
    test(
      'Admin deletes an employee from the Employee List',
      { tag: [TAGS.p1] },
      async ({ employee, employeeListPage, apiClient }) => {
        await test.step('Delete the employee from the Employee List', async () => {
          await employeeListPage.open();
          await employeeListPage.searchByEmployeeId(employee.employeeId);
          await employeeListPage.expectSingleResult(employee.employeeId);
          await employeeListPage.deleteEmployee(employee.employeeId);
        });

        await test.step('A new search finds no records', async () => {
          await employeeListPage.searchByEmployeeId(employee.employeeId);
          await employeeListPage.expectNoRecords(employee.employeeId);
        });

        await test.step('The API no longer returns the employee', async () => {
          const remaining = await apiClient.employees.findByEmployeeId(employee.employeeId);
          expect(remaining, `API should no longer return Employee Id "${employee.employeeId}"`).toHaveLength(0);

          const response = await apiClient.employees.get(employee.empNumber);
          expect(response.status, `GET /pim/employees/${employee.empNumber} should fail after deletion`).not.toBe(200);
        });
      }
    );
  });
}
