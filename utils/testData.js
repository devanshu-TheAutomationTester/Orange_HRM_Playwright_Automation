// @ts-check
const path = require('path');
const { randomInt, randomUUID } = require('crypto');
const employees = require('../test-data/employees.json');
const { ROOT } = require('../config');
const { EMPLOYEE_ID_MAX_LENGTH } = require('../config/constants');

/**
 * @typedef {{ key: string, middleName: string, employeeIdPrefix: string, profilePicture: string,
 *             update: { jobTitle: string, employmentStatus: string } }} EmployeeRow
 * @typedef {EmployeeRow & { firstName: string, lastName: string, employeeId: string, profilePicturePath: string }} EmployeeData
 */

// Pools for random employee names - edit to change the names used.
const FIRST_NAMES = [
  'Aarav', 'Meera', 'Rohan', 'Ananya', 'Vikram', 'Priya', 'Arjun', 'Kavya', 'Ishaan', 'Diya',
  'Kabir', 'Sanya', 'Aditya', 'Neha', 'Rahul', 'Pooja', 'Karan', 'Riya', 'Siddharth', 'Tara',
  'James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia', 'Lucas', 'Mia', 'Ethan', 'Ava',
]; // prettier-ignore
const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Gupta', 'Iyer', 'Reddy', 'Nair', 'Mehta', 'Joshi', 'Kapoor',
  'Singh', 'Rao', 'Malhotra', 'Chopra', 'Bose', 'Das', 'Pillai', 'Saxena', 'Agarwal', 'Bhat',
  'Smith', 'Johnson', 'Brown', 'Taylor', 'Wilson', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young',
]; // prettier-ignore

/** @template T @param {T[]} list @returns {T} */
const randomItem = (list) => list[randomInt(list.length)];

/**
 * Unique Employee Id, e.g. "QA4821937". Random (not time-based) so parallel workers that start in
 * the same millisecond cannot collide; 10^7 combinations per prefix.
 * @param {string} [prefix]
 */
function uniqueEmployeeId(prefix = 'QA') {
  const digits = String(randomInt(10_000_000)).padStart(7, '0');
  return `${prefix}${digits}`.slice(0, EMPLOYEE_ID_MAX_LENGTH);
}

/** Random first + last name, e.g. { firstName: 'Kavya', lastName: 'Malhotra' }. */
function randomEmployeeName() {
  return { firstName: randomItem(FIRST_NAMES), lastName: randomItem(LAST_NAMES) };
}

/**
 * Fresh, run-specific employee built from a data row.
 * @param {EmployeeRow} row
 * @returns {EmployeeData}
 */
function buildEmployee(row) {
  return {
    ...row,
    ...randomEmployeeName(),
    employeeId: uniqueEmployeeId(row.employeeIdPrefix),
    profilePicturePath: path.resolve(ROOT, row.profilePicture),
  };
}

/**
 * Credentials for a throw-away user. The password satisfies OrangeHRM's default policy
 * (upper + lower case, digit, special character, 8+ chars).
 */
function buildUserCredentials(prefix = 'ess') {
  return {
    username: `${prefix}.${randomUUID().slice(0, 8)}`,
    password: `Pw!${randomUUID().slice(0, 8)}Qa${randomInt(10, 99)}`,
  };
}

/** A password that is guaranteed not to be the real one. */
function invalidPassword() {
  return `invalid-${randomUUID()}`;
}

/**
 * All data rows, or only the one named by EMPLOYEE_KEY (e.g. qa-engineer-permanent).
 * @returns {EmployeeRow[]}
 */
function employeeRows() {
  const key = process.env.EMPLOYEE_KEY;
  const rows = key ? employees.filter((row) => row.key === key) : employees;
  if (rows.length === 0) throw new Error(`EMPLOYEE_KEY "${key}" does not match any row in test-data/employees.json`);
  return rows;
}

module.exports = {
  employeeRows,
  buildEmployee,
  buildUserCredentials,
  invalidPassword,
  uniqueEmployeeId,
  randomEmployeeName,
};
