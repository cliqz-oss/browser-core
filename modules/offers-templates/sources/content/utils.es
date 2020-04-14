import { chrome } from '../../platform/content/globals';
import send from './transport';
import { IS_POPUP, MAX_WINDOW_HEIGHT, MAX_WINDOW_HEIGHT_AUTOTRIGGER } from './constants';

/** **************************************************************** */

export function css(prefix) {
  return (...args) => [...args].filter(Boolean).map(cls => prefix + cls).join(' ');
}
// chrome.i18n.getUILanguage is undefined in content tests
export const getUILanguage = () => chrome.i18n.getUILanguage && chrome.i18n.getUILanguage();
export const i18n = (key, ...params) => chrome.i18n.getMessage(`myoffrz_${key}`, params);

/** **************************************************************** */

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

/** **************************************************************** */

function popupHeight(padding) {
  const height = calcHeight('.main__header')
    + calcHeight('.content__size')
    + calcHeight('.main__footer');
  return height > 0 ? height + padding : 0;
}

function absoluteHeight(padding) {
  const height = calcHeight('#cliqz-offers-templates');
  return height > 0 ? height + padding : 0;
}

function getHeight(type, padding, autoTrigger) {
  const heightMapper = {
    tooltip: absoluteHeight,
    checkout: absoluteHeight,
    reminder: absoluteHeight,
    card: popupHeight,
  };
  const height = heightMapper[type](padding) || 0;
  const maxHeight = autoTrigger ? MAX_WINDOW_HEIGHT_AUTOTRIGGER : MAX_WINDOW_HEIGHT;
  return Math.min(height, maxHeight);
}

function getWidth({ type, products, autoTrigger }) {
  if (products.ghostery && type === 'card' && !autoTrigger) { return 344; }
  return {
    tooltip: 260,
    card: 307,
    reminder: 335,
    checkout: 335,
  }[type] || 307;
}

function getDimensions({ type, products, autoTrigger }) {
  const width = getWidth({ type, products, autoTrigger });
  const selector = '#cliqz-offers-templates';
  setStyles(selector, { 'min-width': `${width}px`, 'max-width': `${width}px` });
  const padding = { card: -2, tooltip: 0, reminder: 8, checkout: 8 }[type] || 0;
  const height = getHeight(type, padding, autoTrigger);
  return [width, height];
}

/** **************************************************************** */

export function resize({
  type = 'card',
  products = {},
  autoTrigger = true,
} = {}) {
  return ({ fullscreen } = {}) => {
    if (fullscreen) { return send('resize', { width: 100, height: 100, suffix: '%' }); }
    const [width, height] = getDimensions({ type, products, autoTrigger });
    return IS_POPUP
      ? setStyles('html', { height: `${height}px`, width: `${width}px` })
      : send('resize', { width, height });
  };
}

const ALLOWED_PRODUCTS = ['chip', 'cliqz', 'amo', 'ghostery'];
export function chooseProduct(products = {}) {
  return ALLOWED_PRODUCTS.find(product => products[product]) || 'myoffrz';
}
