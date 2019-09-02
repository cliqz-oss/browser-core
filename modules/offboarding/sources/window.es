/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../core/kord/inject';
import { openLink, getWindow } from '../core/browser';
import prefs from '../core/prefs';
import config from '../core/config';

export default class Win {
  constructor({ window, settings }) {
    this.settings = settings;
    this.window = window;
    this.coreCliqz = inject.module('core-cliqz');
  }

  init() {}

  unload() {}

  disable() {
    const version = this.settings.version;
    const window = this.window;
    if (window === getWindow()) {
      prefs.set('ext_status', 'disabled');
      try {
        const UNINSTALL_PREF = 'uninstallVersion';
        const lastUninstallVersion = prefs.get(UNINSTALL_PREF, '');

        if (version && (lastUninstallVersion !== version)) {
          prefs.set(UNINSTALL_PREF, version);
          openLink(
            window,
            config.settings.UNINSTALL,
            true, // newTab
            false, // newWindow
            false, // newPrivateWindow
            true // focus
          );
        }
      } catch (e) {
        // Nothing
      }
    }
  }
}
