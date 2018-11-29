import prefs from '../core/prefs';
import logger from './logger';

/**
 * This function is used to evaluate a condition. A condition specifices when a
 * given test should be enabled. It can make use of usual boolean operators:
 * `and`, `or`, `noneOf`, etc. And leaf nodes can be one of the supported
 * operators: `pref`.
 */
export default function evalCondition(condition) {
  if (condition.and !== undefined) {
    // `and`: All operands need to evaluate to `true`
    const operands = condition.and;
    for (let i = 0; i < operands.length; i += 1) {
      if (!evalCondition(operands[i])) {
        return false;
      }
    }
    return true;
  }
  if (condition.or !== undefined) {
    // `or`: One of the operands needs to evaluate to `true`
    const operands = condition.or;
    for (let i = 0; i < operands.length; i += 1) {
      if (evalCondition(operands[i])) {
        return true;
      }
    }
    return false;
  }
  if (condition.noneOf !== undefined) {
    // `noneOf`: None of the operands should evaluate to `true`
    const operands = condition.noneOf;
    for (let i = 0; i < operands.length; i += 1) {
      if (evalCondition(operands[i], context)) {
        return false;
      }
    }
    return true;
  }
  if (condition.pref !== undefined) {
    const { name, hasValue } = condition.pref;
    return prefs.get(name) === hasValue;
  }

  logger.error('condition not supported', condition);
  return false;
}
