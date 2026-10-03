

function apiBase(baseURL) {
  return `${baseURL.replace(/\/$/, '')}/api/v2`;
}

/** GET any endpoint under /api/v2. Returns { status, body } and never throws on HTTP errors. */
async function get(page, baseURL, path) {
  const response = await page.request.get(`${apiBase(baseURL)}${path}`, {
    headers: { Accept: 'application/json' },
    failOnStatusCode: false,
    maxRedirects: 0,
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null; // non-JSON response, e.g. a redirect to the login page
  }
  return { status: response.status(), body };
}

/**
 * Employees whose employeeId matches exactly (detailed model, current + past employees).
 * The API filter `nameOrId` is a "contains" match, hence the exact filter afterwards.
 */
async function findEmployeesByEmployeeId(page, baseURL, employeeId) {
  const query = new URLSearchParams({
    limit: '50',
    offset: '0',
    model: 'detailed',
    includeEmployees: 'currentAndPast',
    nameOrId: employeeId,
  });
  const { status, body } = await get(page, baseURL, `/pim/employees?${query}`);
  if (status !== 200) {
    throw new Error(`GET /pim/employees?nameOrId=${employeeId} returned HTTP ${status}: ${JSON.stringify(body)}`);
  }
  return (body.data || []).filter((employee) => employee.employeeId === employeeId);
}

function getEmployee(page, baseURL, empNumber) {
  return get(page, baseURL, `/pim/employees/${empNumber}`);
}

function getJobDetails(page, baseURL, empNumber) {
  return get(page, baseURL, `/pim/employees/${empNumber}/job-details`);
}

module.exports = { get, findEmployeesByEmployeeId, getEmployee, getJobDetails };
