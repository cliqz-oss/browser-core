//
// If you change this file, change its copy too.
//
// Copy 1: offers-v2/content/coupon/shared-code.es
// Copy 2: popup-notification/content/shared-code.es
//
// There is a risk that cross-module import might import the whole
// module, not only the imported file. It is bad for content scripts.
// Therefore, we copy/paste this file as a remedy.
//

const COUPON_KEYWORDS = ['voucher', 'discount', 'coupon', 'rabatt', 'gutschein', 'promo'];

/**
 * this method will retrieve all the potential fields that we thing that are for
 * inserting coupon codes.
 */
function _getInputFieldsFromTarget(target) {
  const inputFields = target.querySelectorAll('input');
  const includes = (str, substr) => str && str.toLowerCase().includes(substr);
  return [...inputFields].filter(x =>
    x.type !== 'hidden'
    && x.type !== 'password'
    && COUPON_KEYWORDS.some(key => includes(x.name, key) || includes(x.id, key)));
}

function _getButtonFieldsFromTarget(target) {
  // for some cases we have buttons, for some others we have
  // <input class="btn" data-action="save" value="Einlösen" type="submit">
  let buttons = target.querySelectorAll('button');
  if (!buttons.length) {
    buttons = target.querySelectorAll('input[type=submit]');
  }
  return buttons;
}

function _predicate(form, inputExplicit, submitExplicit) {
  // the way it work, probably we need to improve this is:
  // for each form:
  //  - get input fields that seems to be associated to voucher
  //  - get associated buttons (submit)
  //  - if none or more than one input field => discard?
  //  - if none button or more than two => discard result completely
  // Alternatively, re-use given explicit elements
  let returnInput = inputExplicit;
  if (!inputExplicit) {
    const inputFields = _getInputFieldsFromTarget(form);
    if (inputFields.length !== 1) {
      // continue with the next one, note that actually here we may want
      // to choose the most probable one instead of none, for now none is fine
      return { ok: false, input: null, button: null };
    }
    returnInput = inputFields[0];
  }
  let returnButton = submitExplicit;
  if (!submitExplicit) {
    const buttons = _getButtonFieldsFromTarget(form);
    if ((buttons.length !== 1) && (buttons.length !== 2)) {
      return { ok: false, input: null, button: null };
    }
    returnButton = buttons[0];
  }
  return { ok: true, input: returnInput, button: returnButton };
}

/**
 * Get an element by ID, or if none, then re-use ID to search for classes
 */
function getElementByConfigFieldName(document, config, field) {
  let elem = null;
  if (config && config[field]) {
    const elemId = config[field];
    elem = document.getElementById(elemId);
    if (!elem) {
      const els = document.getElementsByClassName(elemId);
      if (els.length === 1) {
        elem = els[0];
      }
    }
  }
  return elem;
}

/**
 * Check each document form if it looks like a coupon input form and return
 * - the coupon input field and
 * . form submit button.
 * Alternatively, use explicit IDs for the elements.
 *
 * @param window
 * @param couponInfo {object}
 *   inputID {string} optional
 *   submitID {string} optional
 *
 * @return {object}
 *   ok {boolean}
 *   input {Element}
 *   button {Element}
 *
 * Note copy/paste remark at the top of this file!
 */
function getCouponsForm(window, couponInfo = {}) {
  const document = window.document;
  const inputExplicit = getElementByConfigFieldName(document, couponInfo, 'inputID');
  const submitExplicit = getElementByConfigFieldName(document, couponInfo, 'submitID');
  if (inputExplicit && submitExplicit) {
    return {
      ok: true,
      input: inputExplicit,
      button: submitExplicit,
    };
  }
  const forms = [...window.document.querySelectorAll('form')];
  const result = forms.reduce((acc, form) => {
    if (!form) { return acc; }
    if (acc.ok) { return acc; }
    return _predicate(form, inputExplicit, submitExplicit);
  }, { ok: false, input: null, button: null });

  return result;
}

export { getCouponsForm }; // eslint-disable-line import/prefer-default-export
