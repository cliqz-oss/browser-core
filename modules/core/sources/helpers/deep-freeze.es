// https://github.com/substack/deep-freeze
/* eslint-disable */
export default function deepFreeze(o) {
  Object.freeze(o);

  Object.getOwnPropertyNames(o).forEach(function (prop) {
    try {
      if (o.hasOwnProperty(prop)
      && o[prop] !== null
      && (typeof o[prop] === "object" || typeof o[prop] === "function")
      && !Object.isFrozen(o[prop])) {
        deepFreeze(o[prop]);
      }
    } catch (e) {
      // due to react-native for android bug, function cannot be freezed
      // `Object.freeze` and `Object.isFrozen` throw a Type error
      // https://github.com/facebook/react-native/issues/2033
    }
  });

  return o;
}
/* eslint-enable */
