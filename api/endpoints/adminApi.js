// @ts-check

/** Admin endpoints: users, job titles, employment statuses. */
class AdminApi {
  /** @param {import('../apiClient').ApiClient} client */
  constructor(client) {
    this.client = client;
  }

  /** GET /admin/users - raw response (used to prove an ESS user is refused). */
  listUsers() {
    return this.client.get('/admin/users', { limit: 1 });
  }

  /**
   * POST /admin/users
   * @param {{ username: string, password: string, empNumber: number, userRoleId: number, status?: boolean }} user
   * @returns {Promise<{ id: number, userName: string, userRole: { id: number, name: string } }>}
   */
  async createUser({ username, password, empNumber, userRoleId, status = true }) {
    const response = await this.client.post('/admin/users', { username, password, status, userRoleId, empNumber });
    return this.client.ensureOk(response, `create user ${username}`);
  }

  /** DELETE /admin/users - raw response @param {number[]} ids */
  deleteUsers(ids) {
    return this.client.delete('/admin/users', { ids });
  }

  /**
   * Returns the id of the job title, creating it when the environment doesn't have it yet.
   * Makes the test data independent of what happens to exist on the target environment.
   * @param {string} title
   * @returns {Promise<number>}
   */
  async ensureJobTitle(title) {
    return this.#ensure({
      kind: 'job title',
      listPath: '/admin/job-titles',
      matches: (/** @type {{ title: string }} */ item) => item.title === title,
      createBody: { title, description: '', note: '' },
      name: title,
    });
  }

  /**
   * Returns the id of the employment status, creating it when missing.
   * @param {string} name
   * @returns {Promise<number>}
   */
  async ensureEmploymentStatus(name) {
    return this.#ensure({
      kind: 'employment status',
      listPath: '/admin/employment-statuses',
      matches: (/** @type {{ name: string }} */ item) => item.name === name,
      createBody: { name },
      name,
    });
  }

  /**
   * Look up -> create if missing -> look up again if the create lost a race with a parallel worker.
   * Reference data is intentionally NOT deleted afterwards: other workers may be using it at the same time.
   * @param {{ kind: string, listPath: string, matches: (item: any) => boolean, createBody: object, name: string }} spec
   * @returns {Promise<number>}
   */
  async #ensure({ kind, listPath, matches, createBody, name }) {
    const find = async () => {
      const list = await this.client.get(listPath, { limit: 0 });
      const items = this.client.ensureOk(list, `list ${kind}s`) || [];
      return items.find(matches);
    };

    const existing = await find();
    if (existing) return existing.id;

    const created = await this.client.post(listPath, createBody);
    if (created.ok) {
      this.client.logger?.info(`created missing ${kind}`, { name, id: created.body.data.id });
      return created.body.data.id;
    }

    // Another worker may have created it between our lookup and our POST (unique-name conflict).
    const retry = await find();
    if (retry) return retry.id;
    throw new Error(`API: could not find or create ${kind} "${name}" - HTTP ${created.status}`);
  }
}

module.exports = { AdminApi };
