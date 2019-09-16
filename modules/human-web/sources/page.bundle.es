/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import createModuleWrapper from '../core/helpers/action-module-wrapper';
import checkIfChromeReady from '../core/content/ready-promise';

(async () => {
  await checkIfChromeReady();

  const humanWeb = createModuleWrapper('human-web');

  const cb = document.getElementById('enableHumanWeb');
  const locale = document.getElementsByClassName('cliqz-locale');
  for (let i = 0; i < locale.length; i += 1) {
    const el = locale[i];
    el.textContent = chrome.i18n.getMessage(el.getAttribute('key'));
  }

  document.getElementById('enableHumanWeb').addEventListener('click', (ev) => {
    humanWeb.setStatus(!ev.target.checked);
  });

  humanWeb.getStatus().then((status) => {
    cb.checked = !status;
  });
})();
