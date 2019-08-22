import { walkDomTreeDepthFirst, getWindowOfHtmlNode } from './utils';

const MINIMAL_BASKET_VALUE_KEYWORDS = ['mindest', 'minimal'];

function isStruckThrough(window, elem) {
  const styles = window.getComputedStyle(elem);
  const lineStyle = styles.getPropertyValue('text-decoration');
  return lineStyle.includes('line-through');
}

// The desired regexp is \d{1,5}[.,]\d{2}, but it will match '22222.22'
// inside '1122222.2211'. Adding border conditions complicate the regexp,
// it is more readable to pre-extract the longer match and reject it
// in later analysis. Also, we want to exclude dates: "30.07.2019"
// should not be interpreted as price "30.07".
// @return: `true` to continue depth traverse, `false` otherwise
const _rePrePrice = /((\d+)[.,](\d+))(.)?/g;
const skipTagsWhenPriceWalk = new Set(['SCRIPT', 'STYLE', 'IFRAME']);

function _pushPricesFromNode(node, pricesAccumulator) {
  //
  // Don't go inside technical elements.
  // Extract prices only from text nodes.
  //
  if (skipTagsWhenPriceWalk.has(node.tagName)) {
    return false;
  }
  if (node.nodeType !== 3) { // 3 is a text node
    return true;
  }
  //
  // One and only one price should be inside the tag.
  //
  const s = node.nodeValue;
  const match = _rePrePrice.exec(s);
  if (!match) {
    return false;
  }
  // The flag "g" of the regular expression says "start search from
  // the last match". If something is found, it is the second price-alike
  // substring in the text. Such nodes should be skipped.
  if (_rePrePrice.exec(s)) {
    return false;
  }
  //
  // Reject a match that doesn't fit the desired regexp
  //
  if ((match[2].length > 5) // digits before comma
    || (match[3].length !== 2) // digits after comma
    || (match[4] === '.') // extra dot, may be a date
  ) {
    return false;
  }
  const price = match[1];
  //
  // If text is struck through, ignore it
  //
  const window = getWindowOfHtmlNode(node);
  const maxNumOfParents = 3;
  for (
    let el = node.parentElement, i = 0;
    el && i < maxNumOfParents;
    el = el.parentElement, i += 1
  ) {
    if (isStruckThrough(window, el)) {
      return false;
    }
  }
  //
  // Store the price
  //
  pricesAccumulator.push(price);
  return false;
}

//
// The list `priceCorrections` maybe contains:
// - coupon value
// - delivery cost
// - some auxiliary values such as taxes
// Provide all combinations of [delivery cost, coupon value] in hope
// that at least some pair is guessed correctly.
//
function* iterDeliveryCouponPairs(priceCorrections) {
  for (const coupon of priceCorrections) {
    yield [0, coupon];
  }
  // The number of correction should be small, unlikely more than 3-4 items.
  // Too many items means that heuristic has failed. In this case,
  // avoid possible performance degradation in nested loops.
  const maxNumberOfCorrections = 8;
  if (priceCorrections.length > maxNumberOfCorrections) {
    return;
  }
  for (const price1 of priceCorrections) {
    for (const price2 of priceCorrections) {
      yield [price1, price2];
    }
  }
}

/**
 * Guess the basket value from page-ordered list of prices.
 *
 * @param {Number[]} prices
 * @returns {Object}
 *   total: how much to pay. Always defined unless `prices` is empty.
 *   base: basket value before price adjustment (delivery, coupon). Optional.
 */
function guessTotal(prices) {
  //
  // Combine pass 1 and pass 2 in one.
  // - pass1: find `top`, the maximal value, closest to the end of the list
  // - pass2: find `vice`, the maximal value in the sublist after `top`,
  //   closest to the beginning of the sublist
  // Remember the positions of the elements.
  //
  const extrem = prices.reduce((acc, cur, idx) => {
    if (cur >= (acc.top || 0)) { // '>=' to use the last one
      return { top: cur, topIdx: idx };
    }
    if (cur > (acc.vice || 0)) { // '>' to use the first one
      return {
        ...acc,
        vice: cur,
        viceIdx: idx
      };
    }
    return acc;
  }, {});
  //
  // The heuristics:
  //
  // If a coupon is not used:
  // 1. the biggest price is what the user should pay
  //
  // If a coupon is used:
  // 2. the biggest price is an intermediate price
  // 3a. the next-to-biggest price is what the user should pay
  // 3b. The price from (3a) is valid only if we can construct it
  //     from the base price from (2)
  //
  const topPrice = extrem.top;
  if (!extrem.viceIdx) {
    return { total: topPrice };
  }
  const vicePrice = extrem.vice;
  //
  // Check the condition (3b).
  //
  const priceCorrections = prices.slice(extrem.topIdx + 1, extrem.viceIdx);
  for (const [delivery, coupon] of iterDeliveryCouponPairs(priceCorrections)) {
    const priceDelta = topPrice + delivery - coupon - vicePrice;
    if (Math.abs(priceDelta) < 0.01) {
      return { base: topPrice, total: vicePrice };
    }
  }
  return { total: extrem.top };
}

function _extractPrices(rootElement) {
  const prices = [];
  walkDomTreeDepthFirst(rootElement, _pushPricesFromNode, prices);
  return prices;
}

function describePrices(window, { totalSelector = undefined } = {}) {
  const asNumber = s => parseFloat(s.replace(',', '.'));
  // If a hint is provided, use it
  if (totalSelector) {
    const totalRoot = window.document.querySelector(totalSelector);
    if (!totalRoot) {
      return {};
    }
    const totals = _extractPrices(totalRoot);
    return {
      total: totals.length === 1 ? asNumber(totals[0]) : undefined
    };
  }
  // Otherwise, use heuristics
  const prices = _extractPrices(window.document.body).map(asNumber);
  return guessTotal(prices);
}

function isMessageAboutNotEnoughBasketValue(htmlElement) {
  const text = htmlElement.textContent.toLowerCase();
  // Error message is expected to be small
  // Do not lookup keywords in re-generated shopping cart, which is big
  const maxLookupTextSize = 80;
  if (text.length > maxLookupTextSize) {
    return false;
  }
  return MINIMAL_BASKET_VALUE_KEYWORDS.some(kw => text.includes(kw));
}

export {
  _extractPrices,
  isMessageAboutNotEnoughBasketValue,
  skipTagsWhenPriceWalk,
  guessTotal,
  describePrices
};
