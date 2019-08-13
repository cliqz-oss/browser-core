/* global window, $ */
import { chrome } from '../../../platform/content/globals';
import send from '../transport';

/** **************************************************************** */

export const SEARCH_PARAMS = new URLSearchParams(window.location.search);
export function css(prefix) {
  return (...args) => [...args].filter(Boolean).map(cls => prefix + cls).join(' ');
}
export const i18n = (key, params = []) => chrome.i18n.getMessage(key, params);

/** **************************************************************** */

export function resize() {
  const width = 335;
  $('#cliqz-offers-cc').css({ 'min-width': width });
  const height = $('#cliqz-offers-reminder').outerHeight() + 8;
  send('resize', { width, height });
}

/** **************************************************************** */

const ALLOWED_PRODUCTS = ['chip', 'freundin'];

export function chooseProduct(products = {}) {
  return ALLOWED_PRODUCTS.find(product => products[product]) || 'myoffrz';
}
