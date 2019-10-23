import { chrome } from '../../../platform/content/globals';
import send from '../transport';

/** **************************************************************** */

export const SEARCH_PARAMS = new URLSearchParams(window.location.search);
export const IS_POPUP = SEARCH_PARAMS.get('popup') !== null;
export function css(prefix) {
  return (...args) => [...args].filter(Boolean).map(cls => prefix + cls).join(' ');
}
// chrome.i18n.getUILanguage is undefined in content tests
export const getUILanguage = () => chrome.i18n.getUILanguage && chrome.i18n.getUILanguage();
export const i18n = (key, params = []) => chrome.i18n.getMessage(key, params);

/** **************************************************************** */

const MAX_WINDOW_HEIGHT = 600;

function calcHeight(selector) {
  return (document.querySelector(selector) || {}).offsetHeight || 0;
}

function setStyles(selector, styles = {}) {
  const node = document.querySelector(selector);
  if (!node) { return; }
  Object.keys(styles).forEach((k) => {
    node.style[k] = styles[k];
  });
}

function popupHeight() {
  const padding = -1;
  const height = calcHeight('.main__header')
    + calcHeight('.content__size')
    + calcHeight('.main__footer');
  return height > 0 ? height + padding : 0;
}

function tooltipHeight() {
  return calcHeight('#cliqz-offers-cc');
}

function getHeight(type = 'card') {
  const heightMapper = {
    tooltip: tooltipHeight,
    card: popupHeight,
  };
  const height = heightMapper[type]() || 0;
  return Math.min(height, MAX_WINDOW_HEIGHT);
}

function getWidth(type = 'card') {
  const widthMapper = {
    tooltip: 260,
    card: 307,
  };
  return widthMapper[type] || 0;
}

/** **************************************************************** */

export function resize({ type = 'card' } = {}) {
  const width = getWidth(type);
  setStyles('#cliqz-offers-cc', { 'min-width': `${width}px` });
  const height = getHeight(type);

  if (IS_POPUP) {
    setStyles('html', { height: `${height}px`, width: `${width}px` });
  } else {
    send('resize', { width, height });
  }
}

/** **************************************************************** */

const ALLOWED_PRODUCTS = ['chip', 'freundin', 'incent', 'cliqz', 'amo'];

export function chooseProduct(products = {}) {
  return ALLOWED_PRODUCTS.find(product => products[product]) || 'myoffrz';
}

/** **************************************************************** */
