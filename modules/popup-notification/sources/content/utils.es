/* eslint-disable import/prefer-default-export */

const COUPON_KEYWORDS = ['voucher', 'discount', 'coupon', 'rabatt', 'gutschein', 'promo'];

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

/**
 * this method will retrieve all the potential fields that we thing that are for
 * inserting coupon codes.
 */
function _getInputFieldsFromTarget(target) {
  const inputFileds = target.querySelectorAll('input');
  const includes = (str, substr) => str && str.toLowerCase().includes(substr);
  return [...inputFileds].filter(x =>
    x.type !== 'hidden'
    && x.type !== 'password'
    && COUPON_KEYWORDS.some(key => includes(x.name, key) || includes(x.id, key)));
}

function _getButtonFieldsFromTarget(target) {
  // for some cases we have buttons, for some others we have
  // <input class="btn" data-action="save" value="Einlösen" type="submit">
  const buttons = [...target.querySelectorAll('button')] || [];
  const inputs = ([...target.querySelectorAll('input')] || [])
    .filter(t => t && (t.type && t.type.toLowerCase() === 'submit'));
  return buttons.concat(inputs);
}

function _predicate(form) {
  // the way it work, probably we need to improve this is:
  // for each form:
  //  - get input fields that seems to be associated to voucher
  //  - get associated buttons (submit)
  //  - if none or more than one input field => discard?
  //  - if none button or more than two => discard result completely
  const inputFields = _getInputFieldsFromTarget(form);
  if (inputFields.length !== 1) {
    // continue with the next one, note that actually here we may want
    // to choose the most probable one instead of none, for now none is fine
    return { ok: false, input: null, button: null };
  }
  const buttons = _getButtonFieldsFromTarget(form);
  if (![1, 2].includes(buttons.length)) {
    return { ok: false, input: null, button: null };
  }
  return { ok: true, input: inputFields[0], button: buttons[0] };
}

/**
 * __copied__ from offers-v2 module
 *
 * Will get the list of buttons, inputFields targets from a list of forms we see
 * on the page and filtering those ones that we consider they are to an .
 */
function getCouponsForm(forms) {
  const result = forms.reduce((acc, form) => {
    if (!form) { return acc; }
    if (acc.ok) { return acc; }
    return _predicate(form);
  }, { ok: false, input: null, button: null });

  return result;
}

export { once, createElement, copySelectedText, getCouponsForm };
