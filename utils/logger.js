// @ts-check
/**
 * Small structured logger.
 *
 * Every entry is a JSON object { ts, level, test, message, ...data }. Entries are
 * - collected per test and attached to the HTML report as `test-log.jsonl` (see fixtures/index.js), and
 * - printed to stdout when their level is >= LOG_LEVEL (default: warn; use LOG_LEVEL=debug to see API calls).
 */

const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });

/** @typedef {keyof typeof LEVELS} LogLevel **/
/** @typedef {{ ts: string, level: LogLevel, test: string, message: string, [key: string]: unknown }} LogEntry **/

/** @returns {number} **/
function consoleThreshold() {
  const configured = /** @type {LogLevel} */ ((process.env.LOG_LEVEL || 'warn').toLowerCase());
  return LEVELS[configured] ?? LEVELS.warn;
}

class Logger {
  /** @param {string} scope usually the test title **/
  constructor(scope) {
    this.scope = scope;
    /** @type {LogEntry[]} **/
    this.entries = [];
    this.threshold = consoleThreshold();
  }

  /**
   * @param {LogLevel} level
   * @param {string} message
   * @param {Record<string, unknown>} [data]
   **/
  log(level, message, data = {}) {
    /** @type {LogEntry} **/
    const entry = { ts: new Date().toISOString(), level, test: this.scope, message, ...data };
    this.entries.push(entry);
    if (LEVELS[level] >= this.threshold) {
      const line = JSON.stringify(entry);
      if (level === 'error' || level === 'warn') console.error(line);
      else console.log(line);
    }
  }

  /** @param {string} message @param {Record<string, unknown>} [data] **/
  debug(message, data) {
    this.log('debug', message, data);
  }

  /** @param {string} message @param {Record<string, unknown>} [data] **/
  info(message, data) {
    this.log('info', message, data);
  }

  /** @param {string} message @param {Record<string, unknown>} [data] **/
  warn(message, data) {
    this.log('warn', message, data);
  }

  /** @param {string} message @param {Record<string, unknown>} [data] **/
  error(message, data) {
    this.log('error', message, data);
  }

  /** @returns {string} JSON Lines **/
  toJSONL() {
    return this.entries.map((e) => JSON.stringify(e)).join('\n');
  }
}

module.exports = { Logger, LEVELS };
