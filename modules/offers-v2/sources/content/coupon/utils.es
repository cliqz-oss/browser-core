import { getCouponsForm } from './shared-code';

const BUY_BUTTON_KEYWORDS = ['buy', 'kaufen', 'bestellen', 'order', 'book', 'buchen'];

function hasBuyText(element) {
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
  words = words.filter(word => BUY_BUTTON_KEYWORDS.indexOf(word) > -1);
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
      && hasBuyText(e)
    ) {
      candidates.push(e);
    }
  });
  return candidates;
};

function walkDomTreeDepthFirst(root, func, arg) {
  const queueToVisit = [root];
  while (queueToVisit.length) {
    const node = queueToVisit.shift();
    if (func(node, arg)) {
      // eslint-disable-next-line prefer-spread
      queueToVisit.unshift.apply(queueToVisit, node.childNodes);
    }
  }
}

function getWindowOfHtmlNode(node) {
  return node.ownerDocument.defaultView || node.ownerDocument.parentWindow;
}

export {
  getCouponsForm,
  getPurchaseButtons,
  walkDomTreeDepthFirst,
  getWindowOfHtmlNode
};
