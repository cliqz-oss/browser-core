/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

var tlmTimer = 0;

var tlmTimerFn = function () {
  setTimeout(function () {
    tlmTimer += 50;
    tlmTimerFn();
  }, 50);
};

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), el => {
    var elArgs = el.dataset.i18n.split(','),
    key = elArgs.shift();
    el.textContent = chrome.i18n.getMessage(key, elArgs);
  });
}

function callAction(module, action, ...args) {
  chrome.runtime.sendMessage({
    target: 'cliqz',
    module,
    action,
    args,
  });
}

function telemetrySig(msg) {
  callAction('core', 'sendTelemetry', {
    type: 'onboarding',
    version: '3.0',
    action: msg.action,
    view: msg.view,
    target: msg.target,
    show_duration: tlmTimer
  });
}


var CALLBACKS = {};
window.addEventListener("message", function (ev) {
  var msg;
  try {
    msg = JSON.parse(ev.data);
  } catch (e) {
    msg = {};
  }

  if (msg.type === "response") {
    var action = CALLBACKS[msg.action];
    if (action) {
      action.call(null, msg.response);
    }
  }
});


function show() {
  // === Telemetry
  telemetrySig({
    action: 'show',
    view: 'intro',
    target: 'page',
    resumed: 'false'
  });

  callAction('onboarding-v3', 'show');
}

function finishOnboarding() {
  callAction('onboarding-v3', 'finishOnboarding');

  telemetrySig({
    action: 'click',
    view: 'intro',
    target: 'start'
  });
}

async function openPrivacySection() {
  callAction('onboarding-v3', 'openPrivacyReport');

  telemetrySig({
    action: 'click',
    view: 'intro',
    target: 'share-data-btn',
  });
}

// =================
// == Document Ready
// =================

document.addEventListener('DOMContentLoaded', () => {
  const raw = navigator.userAgent.match(/Firefox\/([0-9]+)\./);
  const majorVer = raw ? parseInt(raw[1], 10) : false;
  if (majorVer >= 66) {
    document.getElementsByClassName('data_collection_container')[0].classList += ' show';
  }

  localizeDocument();

  show();

  document.getElementById('cqb-start-btn').addEventListener('click', (e) => {
    e.preventDefault();
    finishOnboarding();
  });

  document.getElementById('share-data-btn').addEventListener('click', (e) => {
    e.preventDefault();
    openPrivacySection();
  });

  // Call Telemetry Timer
  tlmTimerFn();
});
