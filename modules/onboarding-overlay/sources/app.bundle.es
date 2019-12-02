/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import config from '../core/config';
import createModuleWrapper from '../core/helpers/action-module-wrapper';
import { getMessage } from '../core/i18n';

const ALLOWED_PRODUCTS = { chip: 'chip', myoffrz: 'myoffrz', cliqz: 'cliqz', ghosterytab: 'ghosterytab' };
const PRODUCT = ALLOWED_PRODUCTS[config.PRODUCT_PREFIX] || 'cliqz';

document.body.classList.add(PRODUCT);

const onboarding = createModuleWrapper('onboarding-overlay');

function saveOptions() {
  onboarding.saveConsentStatus({
    humanWebOptOut: !document.getElementById('humanWebOptOut').checked,
    telemetry: document.getElementById('telemetry').checked,
  });
}

function saveOptionsAndClose() {
  saveOptions();
  window.postMessage({ action: 'continue' }, '*');
}

async function restoreOptions() {
  const prefs = await onboarding.getConsentStatus();
  Object.keys(prefs || {}).forEach((key) => {
    const node = document.getElementById(key);
    if (!node) { return; }
    node.checked = key === 'humanWebOptOut' ? !prefs[key] : prefs[key];
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('.content').addEventListener('change', saveOptions);
document.querySelector('button').addEventListener('click', saveOptionsAndClose);
document.querySelector('.show-more').addEventListener('click', () => {
  document.querySelector('.more').classList.toggle('hide');
  document.querySelector('.show-more').classList.toggle('hide');
});

Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), (el) => {
  // eslint-disable-next-line no-param-reassign
  el.innerHTML = getMessage(`onboarding_${PRODUCT}_${el.dataset.i18n}`);
});
