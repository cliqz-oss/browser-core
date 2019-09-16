/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../core/kord/inject';
import prefs from '../core/prefs';
import config from '../core/config';
import { getMessage } from '../core/i18n';

function getLocationPermState() {
  const data = {
    yes: {
      name: getMessage('always'),
      selected: false
    },
    ask: {
      name: getMessage('always_ask'),
      selected: false
    },
    no: {
      name: getMessage('never'),
      selected: false
    }
  };
  let currentState = prefs.get('share_location', config.settings.geolocation || 'ask');
  if (currentState === 'showOnce') {
    currentState = 'ask';
  }

  // default geolocation 'yes' for funnelCake - 'ask' for everything else
  data[currentState].selected = true;

  return data;
}

export default class Win {
  constructor() {
    this.geolocation = inject.service('geolocation', ['updateGeoLocation']);
  }

  init() {
    this.geolocation.updateGeoLocation();
  }

  unload() {
  }

  status() {
    return {
      visible: true,
      state: getLocationPermState()
    };
  }
}
