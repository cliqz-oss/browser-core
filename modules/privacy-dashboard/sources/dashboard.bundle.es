/* global window, document, localizeDocument, CLIQZ */
import templates from './templates';

Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm');
const utils = CLIQZ.CliqzUtils;
const CliqzEvents = utils.getWindow().CliqzEvents;
const CliqzPrivacyRep = CLIQZ.app.modules['privacy-dashboard'].background.CliqzPrivacyRep;

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
  const signals = CliqzPrivacyRep.getCurrentData();
  Object.keys(SIG_TYPES).forEach(sigType => renderSignal(signals, sigType));
  localizeDocument();
}

function onUpdateData(sigType) {
  const signals = CliqzPrivacyRep.getCurrentData();
  renderSignal(signals, sigType);
}

function init() {
  Promise.resolve().then(renderDashboard);
  CliqzPrivacyRep.registerStream();
  CliqzEvents.sub('PRIVACY_DASHBOARD_NEWDATA', onUpdateData);
  window.addEventListener('unload', CliqzPrivacyRep.unregisterStream);
}

// re-render  all the dashboard - the signals might be expired
setInterval(renderDashboard, 20 * 1000);

init();
