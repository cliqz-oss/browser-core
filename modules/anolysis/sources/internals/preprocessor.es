/* eslint-disable max-len */
import prefs from '../../core/prefs';
import legacyPreprocessor from './preprocessors/legacy';
import logger from './logger';

export default class Preprocessor {
  constructor() {
    this.isDev = prefs.get('developer', false);
  }

  process(signal, schema, schemaName) {
    if (this.isDemographics(signal)) {
      // This is just a way to ignore environment signals from legacy telemetry.
      // Anolysis now has another way to access the latest demographics of the
      // device. This could be deleted in the future if we suppress the
      // environment signal.
      return Promise.resolve({
        demographics: null,
      });
    }

    // Legacy behavior signal
    if (schema === undefined) {
      // This is a legacy signal that should be aggregated
      const type = this.getId(signal);

      if (legacyPreprocessor[type] !== undefined) {
        const newSignal = legacyPreprocessor[type](signal);
        return Promise.resolve({
          type: newSignal.type || type,
          behavior: newSignal.behavior,
        });
      }

      const behavior = {};
      Object.keys(signal)
        .filter(key => !this.isObject(signal[key]))
        .filter(key => key !== 'seq' && key !== 'ts' && key !== 'session')
        .forEach((key) => {
          behavior[key] = signal[key];
        });

      return Promise.resolve({ type, behavior });
    }

    // Check JSON schema using Ajv library if it is `sendToBackend`.
    // We currently perform the schema validation only in developper mode.
    if (this.isDev && schema.sendToBackend) {
      const { valid, errors } = schema.validate(signal);
      if (!valid) {
        logger.error(
          'Signal does not respect schema',
          schemaName,
          signal,
          errors,
        );

        const prettySignal = JSON.stringify(signal, undefined, 2);
        const prettyErrors = JSON.stringify(errors, undefined, 2);
        const prettySchema = JSON.stringify(schema.schema, undefined, 2);
        return Promise.reject(new Error(`Signal could not be validated: got ${prettySignal} with errors: ${prettyErrors} for schema: ${prettySchema}`));
      }
    }

    // New signal, with a schema provided.
    return Promise.resolve({
      type: schemaName,
      behavior: signal,
      meta: {},
    });
  }

  isObject(value) {
    return value !== null && typeof value === 'object';
  }

  isDemographics(signal) {
    return signal.type === 'environment';
  }

  getId({ type, action, target }) {
    let id = '';
    if (type) {
      id = type;
      if (action) {
        id = `${id}.${action}`;
        if (target) {
          id = `${id}.${target}`;
        }
      }
    }
    return id;
  }
}
