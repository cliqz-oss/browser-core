/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import console from '../platform/console';
import prefs from './prefs';
import config from './config';
import { isBetaVersion } from '../platform/platform';

function noop() {}

export function isLoggingEnabled() {
  try {
    // Detect dev flag on react-native
    if (typeof global !== 'undefined' && global.__DEV__ === true) {
      return true;
    }

    // Extension built in development mode
    if (config.environment === 'development') {
      return true;
    }

    // Extension is on beta channel
    if (isBetaVersion()) {
      return true;
    }

    // 'developer' pref set
    if (prefs.get('developer', false)) {
      return true;
    }

    // Fall-back to value of 'showConsoleLogs' pref
    return prefs.get('showConsoleLogs', false);
  } catch (ee) {
    return false;
  }
}

const _console = {};

export function enable() {
  _console.debug = console.log.bind(console, 'Cliqz [debug]');
  _console.log = console.log.bind(console, 'Cliqz');
  _console.error = console.error.bind(console, 'Cliqz [error]');
  _console.warn = console.warn.bind(console, 'Cliqz [warning]');
  _console.warning = _console.warn;

  _console.time = (console.time || noop).bind(console);
  _console.timeEnd = (console.timeEnd || noop).bind(console);
}

export function disable() {
  _console.debug = noop;
  _console.log = noop;
  _console.warn = noop;
  _console.warning = noop;
  _console.error = noop;

  _console.time = noop;
  _console.timeEnd = noop;
}

if (isLoggingEnabled()) {
  enable();
} else {
  disable();
}

export default _console;
