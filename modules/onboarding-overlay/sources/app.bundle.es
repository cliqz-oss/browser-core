/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import config from '../core/config';

const ALLOWED_PRODUCTS = { chip: 'chip', myoffrz: 'myoffrz', cliqz: 'cliqz' };
const PRODUCT = ALLOWED_PRODUCTS[config.PRODUCT_PREFIX] || 'cliqz';

document.body.classList.add(PRODUCT);

function saveOptions() {
  (chrome || browser).runtime.sendMessage({
    module: 'offers-banner',
    args: [{
      humanWebOptOut: !document.getElementById('humanWebOptOut').checked,
      telemetry: document.getElementById('telemetry').checked,
    }],
    action: 'setPref',
  });

  window.postMessage({ action: 'continue' }, '*');
}

function restoreOptions() {
  (chrome || browser).runtime.sendMessage({
    module: 'offers-banner',
    args: [['telemetry', 'humanWebOptOut']],
    action: 'getPref'
  }, (prefs = {}) =>
    Object.keys(prefs).forEach((key) => {
      const node = document.getElementById(key);
      if (!node) { return; }
      node.checked = key === 'humanWebOptOut' ? !prefs[key] : prefs[key];
    }));
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('button').addEventListener('click', saveOptions);
document.querySelector('.show-more').addEventListener('click', () => {
  document.querySelector('.more').classList.toggle('hide');
  document.querySelector('.show-more').classList.toggle('hide');
});

Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), (el) => {
  // eslint-disable-next-line no-param-reassign
  el.innerHTML = chrome.i18n.getMessage(`onboarding_${PRODUCT}_${el.dataset.i18n}`);
});
