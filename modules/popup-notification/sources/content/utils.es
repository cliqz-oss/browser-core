/* eslint-disable import/prefer-default-export */
import { getCouponsForm } from './shared-code';

const ALLOWED_PRODUCTS = ['ghostery', 'chip', 'freundin'];

function createElement(window, { tag, className, textContent, id }) {
  const element = window.document.createElement(tag);
  if (className) { element.classList.add(className); }
  if (textContent) { element.textContent = textContent; }
  if (id) { element.id = id; }
  return element;
}

function copySelectedText(window) {
  let copysuccess = false;
  try {
    copysuccess = window.document.execCommand('copy');
  } catch (err) {
    copysuccess = false;
  }
  return copysuccess;
}

function once(f) {
  let done = false;
  return function wrapper(...rest) {
    if (!done) {
      done = true;
      f.apply(this, rest);
    }
  };
}

function chooseProduct(products = {}) {
  return ALLOWED_PRODUCTS.find(product => products[product]) || 'myoffrz';
}

/**
 * Execute a function several times.
 * `tryFunction` should return an object with two fields:
 * - tryAgain {boolean}  if `true`, call `tryFunction` again
 * - result {*} resolves the returned promise
 */
function retryFunctionSeveralTimes(window, tryFunction, timerIdCallback) {
  let tryN = 0;
  const maxTries = 4; // last check on 3rd second
  const waitIntervalMs = 1000;
  return new Promise((resolve) => {
    function tryFunctionWrapper() {
      const { result, tryAgain } = tryFunction();
      if (tryAgain && (tryN < maxTries)) {
        tryN += 1;
        const timerId = window.setTimeout(tryFunctionWrapper, waitIntervalMs);
        timerIdCallback(timerId);
      } else {
        resolve(result);
      }
    }
    tryFunctionWrapper();
  });
}

export {
  once,
  createElement,
  copySelectedText,
  chooseProduct,
  getCouponsForm,
  retryFunctionSeveralTimes
};
