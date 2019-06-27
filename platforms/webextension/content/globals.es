/* global window, browser, chrome */

const newChrome = (typeof browser !== 'undefined') ? browser : chrome;
const newWindow = window;

export {
  newChrome as chrome,
  newWindow as window
};
