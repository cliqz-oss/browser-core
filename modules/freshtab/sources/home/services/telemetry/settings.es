/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import telemetry from './base';
import config from '../../../config';

const settingsBaseSignal = {
  type: 'home',
  view: 'settings',
};

export function settingsCloseSignal() {
  telemetry({
    ...settingsBaseSignal,
    action: 'click',
    target: 'close',
  });
}

export function settingsRestoreTopSitesSignal() {
  telemetry({
    ...settingsBaseSignal,
    action: 'click',
    target: 'restore_topsites',
  });
}

export function settingsBackgroundSelectSignal(bg, product) {
  telemetry({
    ...settingsBaseSignal,
    action: 'click',
    target: 'background_image',
    state: config.backgrounds[product][bg].alias,
  });
}

export function settingsComponentsToggleSignal(component, oldState) {
  const target = config.components[component];
  const state = oldState ? 'off' : 'on';

  telemetry({
    ...settingsBaseSignal,
    action: 'click',
    target,
    state,
  });
}

export function settingsViewBrowserPrefsSignal() {
  telemetry({
    ...settingsBaseSignal,
    action: 'click',
    target: 'view_browser_prefs',
  });
}


export function newsSelectionChangeSignal(country) {
  const state = country || 'automatic';
  telemetry({
    ...settingsBaseSignal,
    action: 'click',
    target: 'news_language',
    state,
  });
}
