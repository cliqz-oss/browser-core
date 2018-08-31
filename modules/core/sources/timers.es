const _setTimeout = (...args) => (typeof setTimeout === 'undefined' ? window.setTimeout.bind(window) : setTimeout)(...args);
const _setInterval = (...args) => (typeof setInterval === 'undefined' ? window.setInterval.bind(window) : setInterval)(...args);
const _clearTimeout = (...args) => (typeof clearTimeout === 'undefined' ? window.clearTimeout.bind(window) : clearTimeout)(...args);
const _clearInterval = (...args) => (typeof clearInterval === 'undefined' ? window.clearInterval.bind(window) : clearInterval)(...args);

export {
  _setTimeout as setTimeout,
  _setInterval as setInterval,
  _clearTimeout as clearTimeout,
  _clearInterval as clearInterval
};
