import Ajv from '../platform/lib/ajv';

/**
 * This file is meant to contain re-usable code related analyses. You can think
 * of it as a toolbox containing building blocks that can be used for aggregated
 * metrics.
 */

/**
 * Given a histogram which keys are indices (contiguous integers), creates an
 * array histogram where indices are the keys, and values are the counts
 * (defaulting to zero).
 *
 * e.g.:
 * >>> indexHistogramToArray(new Counter([1, 1, 2, 2, 2, 3, 1]))
 * [0, 3, 3, 1]
 */
export function indicesHistogramToArray(counter) {
  const array = [];
  const maximumIndex = Math.max(...counter.keys());
  for (let i = 0; i <= maximumIndex; i += 1) {
    array.push(counter.get(i));
  }
  return array;
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

export function loadSignalDefinition(definition) {
  // Compile schema validator
  // TODO: Could be done lazily
  const ajv = new Ajv();
  const hardenedSchema = hardenSchema(definition.schema);
  const validate = ajv.compile(hardenedSchema);

  return Object.freeze({
    sendToBackend: false, // Defaults to aggregating signals.
    needsGid: false, // Defaults to not sending a GID with signals.
    version: null, // Defaults to having `null` as a version.
    ...definition,

    // Additional properties
    validate,
    schema: hardenedSchema,
  });
}
