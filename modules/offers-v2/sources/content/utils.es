/* eslint-disable import/prefer-default-export */

//
// Amazon has a lot of domains, some of them are:
// 'amazon.com.au', 'amazon.de', 'amazon.co.uk', 'amazon.com'
//
const reAmazon = /(^|\.)amazon\..{2,6}$/i;
export function isAmazonDomain(domain) {
  return reAmazon.test(domain);
}

const reEbay = /(^|\.)ebay\..{2,6}$/i;
export function isEbayDomain(domain) {
  return reEbay.test(domain);
}

// the keywords we want to check to identify for input fields
const couponKeyWords = ['voucher', 'discount', 'coupon', 'rabatt', 'gutschein', 'promo'];
const buyButtonKeyWords = ['buy', 'kaufen', 'bestellen', 'order', 'book', 'buchen'];

const COUPON_APPLICATION_KEYWORDS = [
  'code',
  'gutschein',
  'rabatt',
  'rabattcode',
  'coupon',
  'discount',
];
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
    && couponKeyWords.some(key => includes(x.name, key) || includes(x.id, key)));
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
  //  - if none button or more than one => discard result completely
  const inputFields = _getInputFieldsFromTarget(form);
  if (inputFields.length !== 1) {
    // continue with the next one, note that actually here we may want
    // to choose the most probable one instead of none, for now none is fine
    return { ok: false, input: null, button: null };
  }
  const buttons = _getButtonFieldsFromTarget(form);
  if (buttons.length !== 1) {
    return { ok: false, input: null, button: null };
  }
  return { ok: true, input: inputFields[0], button: buttons[0] };
}

/**
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

function _findResultOfCouponApplication(classList) {
  const matcher = keys => cls => keys.some(k => cls.toLowerCase().indexOf(k) !== -1);
  const isError = classList.some(matcher(['error']));
  if (isError) { return [true, 'error']; }
  const isSuccess = classList.some(matcher(['success', 'voucher']));
  if (isSuccess) { return [true, 'success']; }
  return [false, 'notfound'];
}

function _tryGuessResultCouponApplication(domNode) {
  const maxDepth = 5;
  let depth = 0;
  let node = domNode;
  while (node && depth < maxDepth) {
    const classList = node.classList || [];
    const [ok, result] = _findResultOfCouponApplication([...classList]);
    if (ok) { return result; }
    node = node.parentNode;
    depth += 1;
  }
  return 'notfound';
}

function _isCouponApplicationNode(node, keywords) {
  if (node.nodeType !== node.TEXT_NODE) { return [false, null]; }
  const areLookingForCouponCode = keywords.length === 1;
  const content = areLookingForCouponCode
    ? node.textContent
    : node.textContent.toLowerCase();
  return keywords.some(value => content.indexOf(value) !== -1)
    ? [true, node]
    : [false, null];
}

function _findCouponApplicationNode(node, acc, keywords) {
  if (acc.done) { return; }
  const [ok, couponApplicationNode] = _isCouponApplicationNode(node, keywords);
  if (ok) {
    acc.done = true;
    acc.node = couponApplicationNode;
    return;
  }
  if (node.hasChildNodes() && node.tagName !== 'IFRAME') {
    node.childNodes.forEach(x => _findCouponApplicationNode(x, acc, keywords));
  }
}

function _findCouponApplication(node, keywords) {
  const acc = {};
  _findCouponApplicationNode(node, acc, keywords);
  if (!acc.done) { return ''; }
  const result = _tryGuessResultCouponApplication(acc.node);
  return result;
}

function findCouponApplication(node, code, { strategy = 'full' }) {
  const result = _findCouponApplication(node, [code]);
  if (strategy === 'code') { return result; }
  return result || _findCouponApplication(node, COUPON_APPLICATION_KEYWORDS);
}

function hasValidText(element) {
  let text = element.value || element.textContent;
  if (text.length === 0 && element.parentElement) {
    // Try to get text from parent element,
    // This happens mostly with Amazon
    text = element.parentElement.value
      || element.parentElement.textContent;
  }
  if (!text) { return false; }
  text = text.trim().toLowerCase();
  // This is arbitrary, but the buy button should not be this long
  if (text.length > 50) {
    return false;
  }
  let words = text.split(/\s+/);
  words = words.filter(word => buyButtonKeyWords.indexOf(word) > -1);
  return words.length > 0;
}

const getPurchaseButtons = (window) => {
  // Filter out potential product pages
  if (window.location.href.split(/[/|-]/).length > 8) {
    return [];
  }

  const document = window.document;
  const candidates = [];
  const selector = [
    'button',
    'input[type="button"]',
    'input[type="submit"]',
    'a[href*="checkout"]',
  ].join(', ');
  document.querySelectorAll(selector).forEach(e => candidates.push(e));
  return candidates.filter(e => !e.hidden).filter(e => e.offsetHeight > 20)
    .filter(hasValidText);
};

export {
  getCouponsForm,
  findCouponApplication,
  getPurchaseButtons
};
