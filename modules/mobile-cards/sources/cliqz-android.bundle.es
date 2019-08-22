/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AppRegistry } from 'react-native';
import MobileCards from './MobileCards';
import { window } from '../platform/globals';

const root = window.document.getElementById('root');

AppRegistry.registerComponent('MobileCards', () => MobileCards);

AppRegistry.runApplication('MobileCards', {
  initialProps: {
  },
  rootTag: root
});
