// @ts-check
/**
 * JSON schemas (draft-07) for the OrangeHRM API responses the suite relies on.
 * Used through the custom matcher `expect(body).toMatchSchema('employeeList')` (fixtures/matchers.js).
 * Only fields the tests read are required; extra fields are allowed so harmless API additions don't fail the suite.
 */

const nullableInt = { type: ['integer', 'null'] };
const nullableString = { type: ['string', 'null'] };

const employeeSummary = {
  type: 'object',
  required: ['empNumber', 'employeeId', 'firstName', 'lastName', 'middleName'],
  properties: {
    empNumber: { type: 'integer', minimum: 1 },
    employeeId: { type: 'string' },
    firstName: { type: 'string', minLength: 1 },
    middleName: { type: 'string' },
    lastName: { type: 'string', minLength: 1 },
    terminationId: nullableInt,
  },
};

const jobTitleRef = {
  type: 'object',
  required: ['id', 'title'],
  properties: { id: nullableInt, title: nullableString },
};

const empStatusRef = {
  type: 'object',
  required: ['id', 'name'],
  properties: { id: nullableInt, name: nullableString },
};

const employeeDetailed = {
  ...employeeSummary,
  required: [...employeeSummary.required, 'jobTitle', 'empStatus'],
  properties: {
    ...employeeSummary.properties,
    jobTitle: jobTitleRef,
    empStatus: empStatusRef,
    supervisors: { type: 'array' },
  },
};

/** @param {object} item */
const envelope = (item) => ({
  type: 'object',
  required: ['data', 'meta'],
  properties: { data: item },
});

/** @param {object} item */
const listEnvelope = (item) => ({
  type: 'object',
  required: ['data', 'meta'],
  properties: {
    data: { type: 'array', items: item },
    meta: { type: 'object', required: ['total'], properties: { total: { type: 'integer', minimum: 0 } } },
  },
});

const jobDetails = {
  type: 'object',
  required: ['empNumber', 'jobTitle', 'empStatus', 'joinedDate'],
  properties: {
    empNumber: { type: 'integer', minimum: 1 },
    jobTitle: jobTitleRef,
    empStatus: empStatusRef,
    joinedDate: nullableString,
  },
};

const schemas = {
  employee: envelope(employeeSummary),
  employeeList: listEnvelope(employeeDetailed),
  jobDetails: envelope(jobDetails),
};

module.exports = { schemas };
