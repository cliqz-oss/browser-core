/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global Handlebars */

import templates from '../templates';

export default async function main(adblocker) {
  // Register and plug in the templates
  Handlebars.partials = templates;
  const path = '';

  const status = await adblocker.status();
  document.getElementById('main').innerHTML = templates.main({
    path,
    enabled: status.enabled,
    ready: status.ready,
  });

  // TODO toggle prefs from the UI
  // TODO number of filters (network, cosmetics)
  // TODO reset/force update buttons
  document.getElementById('status').innerHTML = templates.status(status);
  document.getElementById('settings').innerHTML = templates.settings(status);
  document.getElementById('lists').innerHTML = templates.lists(status);
  document.getElementById('logs').innerHTML = templates.logs(status);
}
