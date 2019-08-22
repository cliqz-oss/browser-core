/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../../core/kord/inject';

const callAction = (module, action, ...args) => inject.module(module).action(action, ...args);
const createModuleWrapper = (module, actions) =>
  actions.reduce((all, action) =>
    ({ ...all, [action]: callAction.bind(null, module, action) }), {});

export default class Cliqz {
  constructor() {
    this.mobileCards = createModuleWrapper('mobile-cards', [
      'openLink',
      'callNumber',
      'openMap',
      'hideKeyboard',
      'sendUIReadySignal',
      'handleAutocompletion',
      'getConfig',
      'getTrackerDetails',
    ]);

    this.core = createModuleWrapper('core', []);
    this.search = createModuleWrapper('search', ['getSnippet', 'reportHighlight']);
    this.geolocation = createModuleWrapper('geolocation', ['updateGeoLocation']);
  }
}
