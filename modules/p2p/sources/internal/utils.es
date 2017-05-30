function has(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

function isArrayBuffer(x) {
  return x instanceof ArrayBuffer || Object.prototype.toString.call(x) === '[object ArrayBuffer]';
}

export { has, isArrayBuffer };
