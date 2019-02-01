/* global window, document */
import templates from './templates';
import createSpananForModule from '../core/helpers/spanan-module-wrapper';


const privacyModule = createSpananForModule('privacy-dashboard');
const actions = privacyModule.createProxy();

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
  actions.getData().then((data) => {
    Object.keys(data).forEach(sigType => renderSignal(data, sigType));
    localizeDocument();
  });
}

// TEMP force refresh whole dashboard
setInterval(renderDashboard, 2000);

actions.register();
renderDashboard();

window.addEventListener('unload', actions.unregister);
