import lazyLoader from './helpers';

const zlibProxy = lazyLoader('pako.min.js', 'pako');

export function inflate(...args) {
  return zlibProxy.inflate.call(zlibProxy, ...args);
}

export function deflate(...args) {
  return zlibProxy.deflate.call(zlibProxy, ...args);
}
