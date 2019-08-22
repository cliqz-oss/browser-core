/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AppRegistry } from 'react-native';
import FixturesList from './debug/FixturesList';
import MobileCards from './MobileCards';
import { window } from '../platform/globals';

AppRegistry.registerComponent('FixturesList', () => FixturesList);
AppRegistry.registerComponent('MobileCards', () => MobileCards);

const modes = {
  live: () => {
    AppRegistry.runApplication('MobileCards', {
      initialProps: {
      },
      rootTag: document.getElementById('root')
    });
  },

  fixtures: () => {
    AppRegistry.runApplication('FixturesList', {
      initialProps: {},
      rootTag: document.getElementById('root')
    });
  },
};

window.addEventListener('load', () => modes.live());
