/* global window, $ */
import { chrome } from '../../../platform/content/globals';
import send from '../transport';

/** **************************************************************** */

export const SEARCH_PARAMS = new URLSearchParams(window.location.search);
export const IS_POPUP = SEARCH_PARAMS.get('popup') !== null;
export function css(prefix) {
  return (...args) => [...args].filter(Boolean).map(cls => prefix + cls).join(' ');
}
export const i18n = (key, params = []) => chrome.i18n.getMessage(key, params);

/** **************************************************************** */

const POPUP_WIDTH = 264;
const TOOLTIP_WIDTH = 240;
const MAX_WINDOW_HEIGHT = 600;

function popupHeight() {
  const padding = 4;
  return $('.main__header').outerHeight()
    + $('.content__size').outerHeight()
    + $('.main__footer').outerHeight()
    + padding;
}

function tooltipHeight() {
  return $('#cliqz-offers-cc').outerHeight();
}

function getHeight(tooltip = false) {
  const height = tooltip ? tooltipHeight() : popupHeight();
  return Math.min(height, MAX_WINDOW_HEIGHT);
}

/** **************************************************************** */

export function resize({ tooltip = false } = {}) {
  const width = tooltip ? TOOLTIP_WIDTH : POPUP_WIDTH;
  $('#cliqz-offers-cc').css({ 'min-width': width });
  const height = getHeight(tooltip);

  if (IS_POPUP) {
    $('html').css({ height, width });
  } else {
    send('resize', { width, height });
  }
}

/** **************************************************************** */
