import Ajv from '../../platform/lib/ajv';

function range(start, end) {
  const result = [];
  for (let i = start; i <= end; i += 1) {
    result.push(i);
  }
  return result;
}

function hardenSchema(schema) {
  return {
    // NOTE: it's probably too strict to disallow extra properties. It's useful
    // to group several signals under the same schema, if they share the same
    // core properties. For example, freshtab news signals can have some
    // optional properties.
    // additionalProperties: false,
    required: Object.keys(schema.properties || {}),
    ...schema,
  };
}


/**
 * Task is an abstraction over the concept of daily aggregation (as used in
 * Anolysis to generate signals to send to our backend), or more generally, on
 * some function that we want to evaluate maximum once a day, and which can
 * generate signals (or nothing).
 *
 */
export default class Task {
  constructor({ schema, sendToBackend, needsGid, version, offsets, generate }) {
    this.schema = hardenSchema(schema);
    this.sendToBackend = sendToBackend !== undefined ? sendToBackend : false;
    this.needsGid = needsGid !== undefined ? needsGid : false;
    this.version = version !== undefined ? version : null;
    this.offsets = new Set(offsets || range(1, 30));
    this.generate = generate;

    this._validate = null;
  }

  validate(...args) {
    if (this._validate === null) {
      const ajv = new Ajv();
      this._validate = ajv.compile(this.schema);
    }
    return this._validate(...args);
  }

  shouldGenerateForOffset(offset) {
    return (this.generate !== undefined && this.offsets.has(offset));
  }
}
