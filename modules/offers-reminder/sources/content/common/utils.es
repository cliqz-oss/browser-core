import { chrome } from '../../../platform/content/globals';
import send from '../transport';

/** **************************************************************** */

export const SEARCH_PARAMS = new URLSearchParams(window.location.search);
export function css(prefix) {
  return (...args) => [...args].filter(Boolean).map(cls => prefix + cls).join(' ');
}
export const i18n = (key, params = []) => chrome.i18n.getMessage(`myoffrz_${key}`, params);

/** **************************************************************** */

function calcHeight(selector) {
  return (document.querySelector(selector) || {}).offsetHeight || 0;
}

function setMinWidth(selector, value) {
  const node = document.querySelector(selector);
  if (node) { node.style['min-width'] = value; }
}

export function resize() {
  const width = 335;
  const padding = 8;
  setMinWidth('#cliqz-offers-cc', `${width}px`);
  const height = calcHeight('#cliqz-offers-reminder');
  send('resize', { width, height: height > 0 ? height + padding : 0 });
}

/** **************************************************************** */

const ALLOWED_PRODUCTS = ['chip', 'cliqz', 'amo', 'ghostery'];
export function chooseProduct(products = {}) {
  return ALLOWED_PRODUCTS.find(product => products[product]) || 'myoffrz';
}
