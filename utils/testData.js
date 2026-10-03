const employees = require('../test-data/employees.json');

// OrangeHRM limits Employee Id to 10 characters. 
const EMPLOYEE_ID_MAX_LENGTH = 10;

// Unique Employee Id per run (e.g. "QA4821937") so tests can be repeated on the shared demo.
function uniqueEmployeeId(prefix = 'QA') {
  const digits = `${Date.now()}`.slice(-6) + Math.floor(Math.random() * 10);
  return `${prefix}${digits}`.slice(0, EMPLOYEE_ID_MAX_LENGTH);
}

// Pools for random employee names - edit to change the names used.
const FIRST_NAMES = [
  'Aarav', 'Meera', 'Rohan', 'Ananya', 'Vikram', 'Priya', 'Arjun', 'Kavya', 'Ishaan', 'Diya',
  'Kabir', 'Sanya', 'Aditya', 'Neha', 'Rahul', 'Pooja', 'Karan', 'Riya', 'Siddharth', 'Tara',
  'James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia', 'Lucas', 'Mia', 'Ethan', 'Ava',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Gupta', 'Iyer', 'Reddy', 'Nair', 'Mehta', 'Joshi', 'Kapoor',
  'Singh', 'Rao', 'Malhotra', 'Chopra', 'Bose', 'Das', 'Pillai', 'Saxena', 'Agarwal', 'Bhat',
  'Smith', 'Johnson', 'Brown', 'Taylor', 'Wilson', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young',
];

const randomItem = (list) => list[Math.floor(Math.random() * list.length)];

// Random first + last name, different on every run (e.g. "Kavya Malhotra").
function randomEmployeeName() {
  return { firstName: randomItem(FIRST_NAMES), lastName: randomItem(LAST_NAMES) };
}

// Run-specific copy of a data row with a random name and a generated Employee Id.
function buildEmployee(row) {
  return { ...row, ...randomEmployeeName(), employeeId: uniqueEmployeeId(row.employeeIdPrefix) };
}

// All data rows, or only the one named by EMPLOYEE_KEY (e.g. qa-engineer-permanent). 
function employeeRows() {
  const key = process.env.EMPLOYEE_KEY;
  return key ? employees.filter((row) => row.key === key) : employees;
}

module.exports = { employeeRows, buildEmployee, uniqueEmployeeId, randomEmployeeName };
