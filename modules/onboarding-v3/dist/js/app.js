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
}

// =================
// == Document Ready
// =================

$( document ).ready(function() {
  localizeDocument();

  show();

  $("#cqb-start-btn").click(function (e) {
    e.preventDefault();
    finishOnboarding();
  });

  //Call Telemetry Timer
  tlmTimerFn();
});
