import Ajv from '../platform/lib/ajv';

export function generateFromType(selectors) {
  return (aggregation) => {
    const signals = [];

    (typeof selectors === 'string' ? [selectors] : selectors).forEach((selector) => {
      if (aggregation.types[selector] !== undefined) {
        signals.push({
          type: selector,
          ...aggregation.types[selector],
        });
      }
    });

    return signals;
  };
}

function hardenSchema(schema) {
  return {
    additionalProperties: false,
    required: Object.keys(schema.properties || {}),
    ...schema,
  };
}

const statsStringSchema = {
  additionalProperties: false,
  required: ['count', 'categories'],
  properties: {
    count: { type: 'number' },
    categories: {
      type: 'object',
      // TODO: Make use of `enum` field to list all possible categories
      // If available.
    }
  }
};

const statsNumberSchema = {
  additionalProperties: false,
  required: ['numbers', 'nulls'],
  properties: {
    numbers: {
      additionalProperties: false,
      required: ['count', 'mean', 'median', 'stdev', 'min', 'max'],
      properties: {
        count: { type: 'number' },
        mean: { type: 'number' },
        median: { type: 'number' },
        stdev: { type: 'number' },
        min: { type: 'number' },
        max: { type: 'number' },
      },
    },
    nulls: {
      additionalProperties: false,
      required: ['count'],
      properties: {
        count: { type: 'number' },
      }
    },
  },
};

function aggregationSchema(schema) {
  const keys = {};
  Object.keys(schema.properties).forEach((k) => {
    if (k === 'type') { return; }

    const value = schema.properties[k];
    if (value.type === 'number') {
      keys[k] = statsNumberSchema;
    } else if (value.type === 'string') {
      // TODO: it would be nice to enforce the presence of `enum` for string
      // types. Which means you would need to specify the set of all possible
      // values in the schema. That would allow to make sure privacy is
      // preserved.
      keys[k] = statsStringSchema;
    } else {
      throw new Error(
        `Only numbers and strings are allowed in schemas: ${JSON.stringify(schema)}`
      );
    }
  });

  return {
    additionalProperties: false,
    required: ['count', 'keys'],
    properties: {
      type: { type: 'string' },
      count: { type: 'number' },
      keys: {
        additionalProperties: false,
        required: Object.keys(keys),
        properties: keys,
      },
    },
  };
}

/**
 * Given a valid schema, create a new schema corresponding to the signals
 * automatically generated from the aggregation of the original signals.
 */
export function aggregate(name, { schema, needsGid, generate }) {
  return {
    _source_schema: hardenSchema(schema),
    generate: generate || generateFromType(name),
    instantPush: false,
    needsGid: needsGid || false,
    schema: aggregationSchema(schema),
  };
}

export function loadSchemas(schemas) {
  const result = {};

  Object.keys(schemas).forEach((name) => {
    const { schema } = schemas[name];

    // Compile schema validator
    // TODO: Could be done lazily
    const ajv = new Ajv();
    const validate = ajv.compile(hardenSchema(schema));

    result[name] = Object.freeze({
      needsGid: false, // Default to not sending a GID with signals
      instantPush: false, // Default to sending aggregated signals
      ...schemas[name],
      name,
      validate,
    });
  });

  return result;
}
