/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global window, document */
import templates from './templates';
import createModuleWrapper from '../core/helpers/action-module-wrapper';


const privacyModule = createModuleWrapper('privacy-dashboard');

function localizeDocument() {
  Array.from(document.querySelectorAll('[data-i18n]'))
    .forEach((el) => {
      const elArgs = el.dataset.i18n.split(',');
      const key = elArgs.shift();
      /* eslint-disable */
      el.innerHTML = chrome.i18n.getMessage(key, elArgs);
      /* eslint-enable */
    });
}
localizeDocument();

const template = templates.data_list;
const SIG_TYPES = {
  tel: 'telemetryData',
  hw: 'humanwebData',
  ql: 'searchData'
};

function renderSignal(signals, sigType) {
  const divID = SIG_TYPES[sigType];
  document.getElementById(divID).innerHTML = template(signals[sigType]);
}

function renderDashboard() {
  privacyModule.getData().then((data) => {
    Object.keys(data).forEach(sigType => renderSignal(data, sigType));
    localizeDocument();
  });
}

// TEMP force refresh whole dashboard
setInterval(renderDashboard, 2000);

privacyModule.register();
renderDashboard();

window.addEventListener('unload', privacyModule.unregister);
