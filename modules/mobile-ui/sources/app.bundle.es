/* global window */

import "node_modules/core-js/client/core.min.js"
import "specific/js/libs/ios-orientationchange-fix.js"
import "specific/js/jsAPI.js"
import osAPI from "specific/js/osAPI.js"

import utils from '../core/utils';
import config from '../core/config';

/* modules */
import core from '../core/index';
import cliqz from '../core-cliqz/index';
import dev from '../mobile-dev/index';
import autocomplete from '../autocomplete/index';
import ui from '../mobile-ui/index';
import downloader from '../yt-downloader/index';
import window from '../platform/window';

window.CLIQZ = {};

const loadModule = (module) => {
  return Promise.resolve(module.Background.init()).then(() => {
    const moduleWindow = new module.Window({ window });
    return moduleWindow.init();
  });
};

window.document.addEventListener('DOMContentLoaded', function () {
  loadModule(core).then(() => {
    return core.Background.providesServices.logos();
  }).then(() => {
    if (config.environment !== 'production') {
      return loadModule(dev);
    } else {
      return Promise.resolve();
    }
  }).then(() => Promise.all([
    loadModule(autocomplete),
    loadModule(cliqz),
    loadModule(ui),
  ])).then(
    () => osAPI.init()
  ).then(
    () => utils.fetchAndStoreConfig()
  ).then(
    () => loadModule(downloader)
  ).catch(e => console.error(e));
});
