/* eslint-disable */

/**
 * Bind functions contexts to a specified object.
 * @param {Object} from - An object, whose function properties will be processed.
 * @param {Object} to - An object, which will be the context (this) of processed functions.
 */

export function bindObjectFunctions(from, to) {
  for (const funcName in from) {
    if (Object.prototype.hasOwnProperty.call(from, funcName)) {
      const func = from[funcName];
      // Can't compare with prototype of object from a different module.
      if (typeof func === 'function') {
        from[funcName] = func.bind(to);
      }
    }
  }
}


export function bindAll(obj, target) {
  return Object.entries(obj).reduce((acc, [key, cb]) => {
    const bound = cb.bind(target);
    acc[key] = (...args) => bound(...args);
    return acc;
  }, {});
}
