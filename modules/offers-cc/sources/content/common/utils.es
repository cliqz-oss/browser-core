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

function getHeight(type = 'card') {
  const heightMapper = {
    tooltip: tooltipHeight,
    card: popupHeight,
    lodgev1: tooltipHeight,
    lodgev2: tooltipHeight,
  };
  const height = heightMapper[type]() || 0;
  return Math.min(height, MAX_WINDOW_HEIGHT);
}

function getWidth(type = 'card') {
  const widthMapper = {
    tooltip: 240,
    card: 264,
    lodgev1: 294,
    lodgev2: 294,
  };
  return widthMapper[type] || 0;
}

/** **************************************************************** */

export function resize({ type = 'card' } = {}) {
  const width = getWidth(type);
  $('#cliqz-offers-cc').css({ 'min-width': width });
  const height = getHeight(type);

  if (IS_POPUP) {
    $('html').css({ height, width });
  } else {
    send('resize', { width, height });
  }
}

/** **************************************************************** */
