// @ts-check

/**
 * @typedef {{ firstName: string, middleName?: string, lastName: string, employeeId: string }} NewEmployee
 * @typedef {{ jobTitleId: number | null, empStatusId: number | null }} JobDetailsUpdate
 */

/** PIM endpoints: /api/v2/pim/employees... */
class EmployeesApi {
  /** @param {import('../apiClient').ApiClient} client */
  constructor(client) {
    this.client = client;
  }

  /**
   * POST /pim/employees
   * @param {NewEmployee} employee
   * @returns {Promise<{ empNumber: number, employeeId: string, firstName: string, lastName: string }>}
   */
  async create(employee) {
    const response = await this.client.post('/pim/employees', {
      firstName: employee.firstName,
      middleName: employee.middleName ?? '',
      lastName: employee.lastName,
      employeeId: employee.employeeId,
    });
    return this.client.ensureOk(response, `create employee ${employee.employeeId}`);
  }

  /**
   * Raw search (detailed model, current + past employees). Returns the full response so that
   * callers can assert on status codes - e.g. what an ESS user is allowed to see.
   * @param {string} nameOrId  OrangeHRM does a "contains" match on this value
   */
  search(nameOrId) {
    return this.client.get('/pim/employees', {
      limit: 50,
      offset: 0,
      model: 'detailed',
      includeEmployees: 'currentAndPast',
      nameOrId,
    });
  }

  /**
   * Employees whose employeeId matches exactly.
   * @param {string} employeeId
   * @returns {Promise<any[]>}
   */
  async findByEmployeeId(employeeId) {
    const response = await this.search(employeeId);
    const data = this.client.ensureOk(response, `search employees by id ${employeeId}`) || [];
    return data.filter((/** @type {{ employeeId: string }} */ e) => e.employeeId === employeeId);
  }

  /** GET /pim/employees/{empNumber} - raw response @param {number} empNumber */
  get(empNumber) {
    return this.client.get(`/pim/employees/${empNumber}`);
  }

  /** GET /pim/employees/{empNumber}/job-details - raw response @param {number} empNumber */
  getJobDetails(empNumber) {
    return this.client.get(`/pim/employees/${empNumber}/job-details`);
  }

  /**
   * PUT /pim/employees/{empNumber}/job-details
   * @param {number} empNumber
   * @param {JobDetailsUpdate} job
   */
  async updateJobDetails(empNumber, { jobTitleId, empStatusId }) {
    const response = await this.client.put(`/pim/employees/${empNumber}/job-details`, {
      joinedDate: null,
      jobTitleId,
      empStatusId,
      jobCategoryId: null,
      subunitId: null,
      locationId: null,
    });
    return this.client.ensureOk(response, `update job details of empNumber ${empNumber}`);
  }

  /**
   * DELETE /pim/employees - raw response (a 404 is normal when the test already deleted it).
   * @param {number[]} empNumbers
   */
  delete(empNumbers) {
    return this.client.delete('/pim/employees', { ids: empNumbers });
  }
}

module.exports = { EmployeesApi };
