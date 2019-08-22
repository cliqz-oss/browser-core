/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const _setTimeout = (...args) => (typeof setTimeout === 'undefined' ? window.setTimeout.bind(window) : setTimeout)(...args);
const _setInterval = (...args) => (typeof setInterval === 'undefined' ? window.setInterval.bind(window) : setInterval)(...args);
const _clearTimeout = (...args) => (typeof clearTimeout === 'undefined' ? window.clearTimeout.bind(window) : clearTimeout)(...args);
const _clearInterval = (...args) => (typeof clearInterval === 'undefined' ? window.clearInterval.bind(window) : clearInterval)(...args);

export {
  _setTimeout as setTimeout,
  _setInterval as setInterval,
  _clearTimeout as clearTimeout,
  _clearInterval as clearInterval
};
