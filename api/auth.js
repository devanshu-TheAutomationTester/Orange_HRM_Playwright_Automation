// @ts-check
/**
 * Session helper: logs in through the same form POST the login page uses, without a browser.
 *
 * The login page embeds a CSRF token in the `:token` attribute of its Vue component; we read it
 * from the HTML and post it with the credentials to /auth/validate. The request context keeps the
 * session cookie, which is then saved as a Playwright storageState file and reused by every test
 * in the worker (see fixtures/index.js) - so only the login tests go through the login UI.
 */

const TOKEN_PATTERN = /:token="([^"]+)"/;

/**
 * @param {import('@playwright/test').APIRequestContext} request  context created with baseURL = app root + '/'
 * @param {{ username: string, password: string }} credentials
 */
async function loginViaApi(request, { username, password }) {
  const loginPage = await request.get('auth/login');
  if (!loginPage.ok()) throw new Error(`Login page returned HTTP ${loginPage.status()}`);

  const match = (await loginPage.text()).match(TOKEN_PATTERN);
  if (!match) throw new Error('Could not find the CSRF token on the login page (has the login page changed?)');
  const token = JSON.parse(match[1].replace(/&quot;/g, '"'));

  const response = await request.post('auth/validate', {
    form: { _token: token, username, password },
  });
  // A successful login redirects to the dashboard; a failed one goes back to /auth/login.
  if (!/\/dashboard\//.test(response.url())) {
    throw new Error(`API login failed for user "${username}" (ended on ${response.url()})`);
  }
}

module.exports = { loginViaApi };
