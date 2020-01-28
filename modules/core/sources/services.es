/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import CONFIG from './config';
import prefs from './prefs';
import { isSearchServiceReady } from './search-engines';
import { service as logos } from './services/logos';
import { service as domainInfo } from './services/domain-info';
import { service as pacemaker } from './services/pacemaker';
import { service as telemetry } from './services/telemetry';
import { service as session } from './services/session';
import { service as cliqzConfig } from './services/cliqz-config';
import { service as hostSettings } from './services/host-settings';
import { service as storage } from './services/storage';

const services = {
  logos,
  'host-settings': hostSettings,
  telemetry,
  // IP driven configuration
  'cliqz-config': cliqzConfig,
  session,
  'search-services': isSearchServiceReady,
  domainInfo,
  pacemaker,
  storage,
};

if (CONFIG.environment !== 'production') {
  services['test-helpers'] = function testHelpers() {
    testHelpers.prefs = prefs;
  };
}

export default services;
