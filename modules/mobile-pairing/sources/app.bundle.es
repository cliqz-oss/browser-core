/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global window */
/* eslint import/no-extraneous-dependencies: 'off' */

import 'node_modules/core-js/client/core.min.js';
import 'specific/js/libs/ios-orientationchange-fix.js';
import 'node_modules/pako/dist/pako.min.js';
import 'specific/js/jsAPI.js';
import osAPI from 'specific/js/osAPI.js';
import config from '../core/config';

/* modules */
import core from '../core/index';
import dev from '../mobile-dev/index';
import pairing from '../mobile-pairing/index';
import console from '../core/console';

window.CLIQZ = {};

const loadModule = module => Promise.resolve(module.Background.init()).then(() => {
  window.CLIQZ.pairing = module.Background; // For debug purposes, temporal
  const moduleWindow = new module.Window({ window });
  return moduleWindow.init();
});

window.document.addEventListener('DOMContentLoaded', () => {
  loadModule(core)
    .then(() => {
      if (config.environment !== 'production') {
        return loadModule(dev);
      }
      return Promise.resolve();
    })
    .then(() => osAPI.init(true))
    .then(() => Promise.all([
      loadModule(pairing),
    ]))
    .catch(e => console.error(e));
});
