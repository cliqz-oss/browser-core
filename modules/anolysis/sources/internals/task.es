import Ajv from '../../platform/lib/ajv';
import logger from './logger';

function range(start, end) {
  const result = [];
  for (let i = start; i <= end; i += 1) {
    result.push(i);
  }
  return result;
}

function hardenSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const hardened = {};
  let isObject = false;

  // TODO: find a way to check for this. At the moment it will break some
  // analyses such as 'metrics.performance.webrequest-pipeline.timings' because
  // it would be cumbersome to list all steps in advance. In general, having
  // histograms for various components will make it hard to automatically
  // enforce `enum` to be specified for strings.
  //
  // Check that if `schema` excepts a 'string', then an `enum` is specified.
  // if (schema.type === 'string' && schema.enum === undefined) {
  //   throw new Error(`Schema with 'string' type without enum: ${JSON.stringify(schema)}`);
  // }

  Object.keys(schema).forEach((key) => {
    // Detect if `schema` is expecting an object, in which case we want to
    // harden it using `required` and `aditionalProperties`.
    if (key === 'properties') {
      isObject = true;
    }

    // Recursively harden the schema
    const value = schema[key];
    if (Array.isArray(value)) {
      hardened[key] = value.map(hardenSchema);
    } else if (value === null) {
      hardened[key] = value;
    } else if (typeof value === 'object') {
      hardened[key] = hardenSchema(value);
    } else {
      hardened[key] = value;
    }
  });

  // Forbid additional properties in object. If it's not specified, it's not
  // allowed.
  if (isObject && hardened.additionalProperties === undefined) {
    hardened.additionalProperties = false;
  }

  if (isObject && hardened.required === undefined) {
    hardened.required = Object.keys(hardened.properties);
  }

  return hardened;
}

const AGGREGATION_OFFSETS = range(1, 30);

/**
 * Task is an abstraction over the concept of daily aggregation (as used in
 * Anolysis to generate signals to send to our backend), or more generally, on
 * some function that we want to evaluate maximum once a day, and which can
 * generate signals (or nothing).
 *
 */
export default class Task {
  constructor({
    name,
    description,
    schema,
    sendToBackend = false,
    needsGid = false,
    version = null,
    offsets = AGGREGATION_OFFSETS,
    generate,
  }) {
    this.originalSchema = schema;
    this._hardenedSchema = null;

    this.name = name;
    this.description = description;
    this.sendToBackend = sendToBackend;
    this.needsGid = needsGid;
    this.version = version;
    this.offsets = new Set(offsets);
    this.generate = generate;

    this._validate = null;
  }

  get schema() {
    if (this._hardenedSchema === null) {
      try {
        this._hardenedSchema = this.sendToBackend
          ? hardenSchema(this.originalSchema)
          : this.originalSchema;
      } catch (ex) {
        logger.error(
          'failed to harden schema',
          {
            name,
            schema: this.originalSchema,
            sendToBackend: this.sendToBackend,
          },
          ex,
        );
      }
    }

    return this._hardenedSchema;
  }

  validate(...args) {
    if (this._validate === null) {
      const ajv = new Ajv();
      this._validate = ajv.compile(this.schema);
    }

    return {
      valid: this._validate(...args),
      errors: this._validate.errors,
    };
  }

  shouldGenerateForOffset(offset) {
    return this.generate !== undefined && this.offsets.has(offset);
  }
}
