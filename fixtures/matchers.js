// @ts-check
const Ajv = require('ajv').default;
const { schemas } = require('../api/schemas');

const ajv = new Ajv({ allErrors: true, strict: false });
/** @type {Record<string, import('ajv').ValidateFunction>} */
const validators = Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, ajv.compile(schema)]));

const matchers = {
  toMatchSchema(received, schemaName) {
    const validate = validators[schemaName];
    if (!validate) {
      return {
        pass: false,
        name: 'toMatchSchema',
        message: () => `Unknown schema "${schemaName}". Known: ${Object.keys(validators)}`,
      };
    }
    const pass = validate(received);
    const errors = (validate.errors || []).map((e) => `  ${e.instancePath || '(root)'} ${e.message}`).join('\n');
    return {
      pass,
      name: 'toMatchSchema',
      message: () =>
        pass
          ? `Expected response NOT to match schema "${schemaName}"`
          : `Response does not match schema "${schemaName}":\n${errors}\n\nReceived: ${JSON.stringify(received, null, 2)}`,
    };
  },
};

module.exports = { matchers };
