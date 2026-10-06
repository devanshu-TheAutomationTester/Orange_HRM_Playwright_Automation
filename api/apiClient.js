// @ts-check
const { TIMEOUTS } = require('../config/constants');

/**
 * @typedef {{ status: number, ok: boolean, body: Record<string, any> | null, durationMs: number }} ApiResponse
 * @typedef {{ data?: unknown, params?: Record<string, string | number | boolean> }} RequestOptions
 */

/**
 * Thin wrapper over Playwright's APIRequestContext for the OrangeHRM REST API v2.
 *
 * - Never throws on HTTP errors: callers decide what a status means (a 403 is the *expected*
 *   outcome in the role-based tests). Use `ensureOk` when a call must succeed.
 * - Does not follow redirects, so an expired session shows up as a 401/302 instead of a login page.
 * - Logs every call (method, path, status, duration) to the structured test logger.
 */
class ApiClient {
  /**
   * @param {import('@playwright/test').APIRequestContext} request  page.request or a standalone context
   * @param {{ apiBaseURL: string, logger?: import('../utils/logger').Logger }} options
   */
  constructor(request, { apiBaseURL, logger }) {
    this.request = request;
    this.apiBaseURL = apiBaseURL.replace(/\/$/, '');
    this.logger = logger;
  }

  /**
   * @param {'GET'|'POST'|'PUT'|'DELETE'} method
   * @param {string} path  e.g. /pim/employees
   * @param {RequestOptions} [options]
   * @returns {Promise<ApiResponse>}
   */
  async send(method, path, { data, params } = {}) {
    const started = Date.now();
    const response = await this.request.fetch(`${this.apiBaseURL}${path}`, {
      method,
      params,
      data,
      headers: { Accept: 'application/json', ...(data !== undefined && { 'Content-Type': 'application/json' }) },
      failOnStatusCode: false,
      maxRedirects: 0,
      timeout: TIMEOUTS.apiRequest,
    });
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null; // not JSON, e.g. an HTML redirect after logout
    }
    const result = {
      status: response.status(),
      ok: response.ok(),
      body,
      durationMs: Date.now() - started,
    };
    this.logger?.debug('api call', { method, path, params, status: result.status, durationMs: result.durationMs });
    return result;
  }

  /** @param {string} path @param {RequestOptions['params']} [params] */
  get(path, params) {
    return this.send('GET', path, { params });
  }

  /** @param {string} path @param {unknown} data */
  post(path, data) {
    return this.send('POST', path, { data });
  }

  /** @param {string} path @param {unknown} data */
  put(path, data) {
    return this.send('PUT', path, { data });
  }

  /** @param {string} path @param {unknown} data */
  delete(path, data) {
    return this.send('DELETE', path, { data });
  }

  /**
   * Throws a descriptive error unless the response is 2xx.
   * @param {ApiResponse} response
   * @param {string} action  what was attempted, e.g. "create employee QA1234567"
   * @returns {any} the response body's `data`
   */
  ensureOk(response, action) {
    if (!response.ok) {
      const message = `API: failed to ${action} - HTTP ${response.status}: ${JSON.stringify(response.body)}`;
      this.logger?.error(message);
      throw new Error(message);
    }
    return response.body?.data;
  }
}

module.exports = { ApiClient };
