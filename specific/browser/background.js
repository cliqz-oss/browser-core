/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global CLIQZ */
const config = CLIQZ.app.config;

chrome.browserAction2.create({
  default_icon: 'modules/control-center/images/cc-active.svg',
  default_title: chrome.i18n.getMessage('control_center_icon_tooltip'),
  default_popup: `${config.baseURL}control-center/index.html`
});
