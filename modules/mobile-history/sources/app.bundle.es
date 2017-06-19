/* global window */

import "bower_components/core.js/client/core.min.js"
import "bower_components/whatwg-fetch/fetch.js"

import "specific/js/libs/ios-orientationchange-fix.js"
import "specific/js/jsAPI.js"
import osAPI from "specific/js/osAPI.js"

import utils from '../core/utils';
import config from '../core/config';

/* modules */
import core from '../core/index';
import dev from '../mobile-dev/index';
import history from '../mobile-history/index';


const modules = new Map();

const loadModule = (name, module) => {
  return Promise.resolve(module.Background.init()).then(() => {
    const moduleWindow = new module.Window({ window });
    moduleWindow.init();
    modules.set(name, {
      background: module.Background,
      window: moduleWindow,
    });
  });
};

window.document.addEventListener('DOMContentLoaded', function () {
  loadModule('core', core).then(() => {
    if (config.environment !== 'production') {
      return loadModule('dev', dev);
    } else {
      return Promise.resolve();
    }
  }).then(
    () => loadModule('history', history)
  ).then(
    () => osAPI.init()
  ).then(
    () => modules.get('history').window.history.init(window.CLIQZ.mode)
  ).catch(e => console.error(e));
});
