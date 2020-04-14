/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import random from '../helpers/random';
import prefs from '../prefs';
import getSynchronizedDate, { isSynchronizedDateAvailable } from '../synchronized-time';
import { dateToDaysSinceEpoch } from '../helpers/date';
import { getChannel } from '../../platform/demographics';
import inject from '../kord/inject';

const getSession = () => prefs.get('session');

function getDay() {
  return Math.floor(new Date().getTime() / 86400000);
}

export async function service(app) {
  let newUser = false;
  const hostSettings = app.services['host-settings'];
  await hostSettings.isReady();

  const saveSession = (sessionString) => {
    prefs.set('session', sessionString);
    hostSettings.api.set('host.session', sessionString);
  };

  const isNewUser = () => newUser;

  if (!prefs.has('session')) {
    // Get number of days since epoch either from config_ts if available
    // (through `getSynchronizedDate`) or fallback to the `Date` API (which
    // is dependent on the timezone of the system).
    const installDate = (isSynchronizedDateAvailable()
      ? dateToDaysSinceEpoch(getSynchronizedDate())
      : getDay()
    );

    const session = [
      random(18),
      random(6, '0123456789'),
      '|',
      installDate,
      '|',
      getChannel() || 'NONE',
    ].join('');

    saveSession(session);

    if (!prefs.has('freshtab.state')) {
      // freshtab is opt-out since 2.20.3
      prefs.set('freshtab.state', true);
    }

    newUser = true;
  }

  return {
    saveSession,
    getSession,
    isNewUser,
  };
}

export default inject.service('session', ['getSession', 'isNewUser']);
