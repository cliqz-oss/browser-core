/* global window, browser, chrome */

const newChrome = (typeof browser !== 'undefined') ? browser : chrome;

export {
  newChrome as chrome,
  window
};
