/* global document, localStorage */
// eslint-disable-next-line
'use strict';

(function setup() {
  const theme = localStorage.theme;

  if (theme) {
    document.body.classList.add(['theme-', theme].join(''));
  }
}());
