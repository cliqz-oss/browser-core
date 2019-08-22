/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* globals chrome */
import cliqz from './cliqz';

export default function t(key) {
  const product = cliqz.storage.state.config.product;
  const tabName = product.charAt(0) + product.slice(1).toLowerCase();
  return chrome.i18n.getMessage(`freshtab_${key}`, [tabName]);
}

function tt(key, params = []) {
  return chrome.i18n.getMessage(key, params);
}

export { t, tt };
