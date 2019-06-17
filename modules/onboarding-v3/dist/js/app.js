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

function telemetrySig(msg) {
  chrome.runtime.sendMessage({
    target: 'cliqz',
    module: 'core',
    action: 'sendTelemetry',
    args: [{
      type: 'onboarding',
      version: '3.0',
      action: msg.action,
      view: msg.view,
      target: msg.target,
      show_duration: tlmTimer
    }]
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

  chrome.runtime.sendMessage({
    target: 'cliqz',
    module: 'onboarding-v3',
    action: 'show'
  });
}

function finishOnboarding() {
  chrome.runtime.sendMessage({
    target: 'cliqz',
    module: 'onboarding-v3',
    action: 'finishOnboarding'
  });

  telemetrySig({
    action: 'click',
    view: 'intro',
    target: 'start'
  });
}

async function openPrivacySection() {
  chrome.omnibox2.navigateTo('about:preferences#privacy-reports', { target: 'tab' });

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
