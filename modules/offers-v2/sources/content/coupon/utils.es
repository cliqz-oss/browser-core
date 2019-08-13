// the keywords we want to check to identify for input fields
import { getCouponsForm } from './shared-code';

const buyButtonKeyWords = ['buy', 'kaufen', 'bestellen', 'order', 'book', 'buchen'];
const COUPON_APPLICATION_KEYWORDS = [
  'code',
  'gutschein',
  'rabatt',
  'rabattcode',
  'coupon',
  'discount',
];

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
  text = text.trim().toLowerCase();
  if (!text) { return false; }
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
  document.querySelectorAll(selector).forEach((e) => {
    if (
      !e.hidden
      && e.offsetHeight > 20
      && hasValidText(e)
    ) {
      candidates.push(e);
    }
  });
  return candidates;
};

export {
  getCouponsForm,
  findCouponApplication,
  getPurchaseButtons
};
