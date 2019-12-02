/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global System */
import config from '../core/config';
import console from '../core/console';

export function loadModule(moduleName) {
  return System.import(`${moduleName}/background`)
    .then(module => module.default.init(config))
    .then(() => System.import(`${moduleName}/window`))
    .then(module => (new module.Default({ window })).init())
    .catch(e => console.log(`Error on loading module: ${moduleName} - ${e.toString()} -- ${e.stack}`, 'Extension'));
}

export default function (window, modules = config.modules) {
  // intersent config file with
  const modulesToLoad = modules.filter(n => config.modules.indexOf(n) !== -1);

  return loadModule('core').then(() => Promise.all(modulesToLoad.map(loadModule)));
}
