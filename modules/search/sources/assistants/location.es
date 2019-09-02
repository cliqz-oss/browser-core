/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from '../../core/prefs';
import config from '../../core/config';

const PREF = 'share_location';
const STATE_ALLOW_ONCE = 'showOnce';
const STATE_ALLOW = 'yes';
const STATE_BLOCK = 'no';
const STATE_ASK = 'ask';

// geolocation 'yes' for funnelCake - 'ask' for everything else
const STATE_DEFAULT = config.settings.geolocation || STATE_ASK;

const getPref = prefs.get.bind(prefs, PREF, STATE_DEFAULT);
const setPref = prefs.set.bind(prefs, PREF);


export default class LocationSharingAssistant {
  constructor({ updateGeoLocation, resetGeoLocation }) {
    this.actions = [
      {
        title: 'show_location_and_contact',
        actionName: 'allowOnce',
      },
      {
        title: 'always_show_location',
        actionName: 'allow',
      },
    ];

    this.updateGeoLocation = updateGeoLocation;
    this.resetGeoLocation = resetGeoLocation;
  }

  get isAskingForLocation() {
    return getPref() === STATE_ASK;
  }

  block() {
    setPref(STATE_BLOCK);
    return Promise.resolve();
  }

  allow() {
    setPref(STATE_ALLOW);
    return this.updateGeoLocation();
  }

  allowOnce() {
    setPref(STATE_ALLOW_ONCE);
    return this.updateGeoLocation();
  }

  clear() {
    // clear is alwasy called from the "ask" state
    // so we should revert back to that
    setPref(STATE_ASK);
    this.resetGeoLocation();
    return Promise.resolve();
  }

  resetAllowOnce() {
    if (getPref() !== STATE_ALLOW_ONCE) {
      return;
    }
    this.clear();
  }

  hasAction(actionName) {
    return this.actions.map(a => a.actionName).indexOf(actionName) !== -1;
  }

  getState() {
    return {
      isAskingForLocation: this.isAskingForLocation,
      actions: this.actions,
    };
  }
}
