import { getCouponsForm } from './shared-code';

export function createElement(window, { tag, className, textContent, id }) {
  const element = window.document.createElement(tag);
  if (className) { element.classList.add(className); }
  if (textContent) { element.textContent = textContent; }
  if (id) { element.id = id; }
  return element;
}

export function once(f) {
  let done = false;
  return function wrapper(...rest) {
    if (!done) {
      done = true;
      f.apply(this, rest);
    }
  };
}

export function findCounponForm(window, config) {
  const { ok, input } = getCouponsForm(window, config);
  if (ok && Boolean(input.value)) { return { ok: false }; }
  return { ok: true, payload: { canInject: ok } };
}

function _produceInputChange(window, input) {
  // Some sites track changes in the input field and for them
  // we should additionally notify that the value is changed.
  const _event = window.document.createEvent('Event');
  _event.initEvent('change', false, true);
  input.dispatchEvent(_event);
}

function _produceClick(window, button, clickEvent = 'click') {
  // sometimes clicks are emulated by other events
  if (button.click && (clickEvent === 'click')) {
    button.click();
  } else {
    const _event = window.document.createEvent('Event');
    _event.initEvent(clickEvent, true, true);
    button.dispatchEvent(_event);
  }
}

export function injectCode(window, config = {}) {
  const { ok, input, button } = getCouponsForm(window, config);
  if (!ok || !config.code) { return; }
  input.value = config.code;
  _produceInputChange(window, input);
  _produceClick(window, button, config.clickEvent);
}

/**
 * Execute a function several times.
 * `tryFunction` should return an object with two fields:
 * - tryAgain {boolean}  if `true`, call `tryFunction` again
 * - result {*} resolves the returned promise
 */
export function retryFunctionSeveralTimes(window, tryFunction) {
  let tryN = 0;
  const maxTries = 4; // last check on 3rd second
  const waitIntervalMs = 1000;
  return new Promise((resolve) => {
    function tryFunctionWrapper() {
      const { result, tryAgain } = tryFunction();
      if (tryAgain && (tryN < maxTries)) {
        tryN += 1;
        window.setTimeout(tryFunctionWrapper, waitIntervalMs);
      } else {
        resolve(result);
      }
    }
    tryFunctionWrapper();
  });
}

export function tryToFindCoupon(window, config = {}) {
  const result = findCounponForm(window, config);
  const { payload: { canInject } = {} } = result;
  const tryAgain = !canInject && config.isDynamicPage;
  return { result, tryAgain };
}
