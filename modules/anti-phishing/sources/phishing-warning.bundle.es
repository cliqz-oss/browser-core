/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import checkIfChromeReady from '../core/content/ready-promise';
import createModuleWrapper from '../core/helpers/action-module-wrapper';

let phishingURL = '';

// gets all the elements with the class 'cliqz-locale' and adds
// the localized string - key attribute - as content
function localizeDoc(doc) {
  const locale = doc.getElementsByClassName('cliqz-locale');
  for (let i = 0; i < locale.length; i += 1) {
    const el = locale[i];
    el.textContent = chrome.i18n.getMessage(el.getAttribute('key'));
  }
}

function getURL() {
  let url = document.documentURI;
  const match = url.match(/u=([^&]+)/);

  if (!match) {
    return ''; // this should not happend though
  }

  url = decodeURIComponent(match[1]);
  return url;
}

function updateText(url) {
  // Add the domain blocked.
  const domain = url.replace('http://', '').replace('https://', '').split('/')[0];
  document.getElementById('phishing-url').textContent = domain;
}

function format() {
  // bundling made System imports obsolete so temporary
  // moving towards a more "nasty" way of importing
  // const CliqzUtils = CLIQZ.CliqzUtils;
  // const hw = CLIQZ.app.modules['human-web'].background.humanWeb;
  // const CliqzAntiPhishing = CLIQZ.app.modules['anti-phishing'].background.CliqzAntiPhishing;
  // const freshtab = CLIQZ.app.modules.freshtab && CLIQZ.app.modules.freshtab.background;

  // get phishing url
  phishingURL = getURL();

  // urlbar
  browser.omnibox2.update({ value: phishingURL });

  // i18n
  localizeDoc(document);

  // Update the text.
  updateText(phishingURL);
}

function updateButtons(aph, url) {
  // safe out
  document.getElementsByClassName('cqz-button-save-out')[0].onclick = () => {
    aph.telemetry('safe_out');
    window.location.replace(chrome.runtime.getURL('modules/freshtab/home.html'));
  };

  // learn more
  document.getElementById('learn-more').onclick = () => {
    aph.telemetry('learn_more');
  };

  // proceed at risk
  document.getElementById('proceed').onclick = () => {
    aph.telemetry('ignore');
    aph.whitelistTemporary(url);
    window.location.replace(url);
  };

  // report as safe
  document.getElementById('report-safe').onclick = () => {
    aph.telemetry('report');
    aph.markAsSafe(url);
    window.location.replace(url);
  };
}

format();
checkIfChromeReady().then(() => {
  updateButtons(createModuleWrapper('anti-phishing'), phishingURL);
}).catch((ex) => {
  // eslint-disable-next-line no-console
  console.error('Chrome was never ready', ex);
});
