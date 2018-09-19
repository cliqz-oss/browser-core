/* global window */
import App from '../core/app';

const CLIQZ = {};
CLIQZ.app = new App({
  version: chrome.runtime.getManifest().version
});
CLIQZ.app.start();
window.CLIQZ = CLIQZ;

window.addEventListener('unload', () => {
  CLIQZ.app.stop();
});
