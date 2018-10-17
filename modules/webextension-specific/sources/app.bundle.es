/* global window */

import App from '../core/app';

const CLIQZ = {};
CLIQZ.app = new App({});
CLIQZ.app.start();
window.CLIQZ = CLIQZ;

window.addEventListener('unload', () => {
  CLIQZ.app.stop();
});
