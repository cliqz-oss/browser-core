const perf = require('@cliqz/webextension-emulator');
const EventSource = require('@cliqz/webextension-emulator/src/event-source').default;
const cliqz = require('./cliqz-api');

const events = ['onInput', 'onKeydown', 'onFocus', 'onBlur', 'onDrop', 'onDropmarker', 'onGotoAddress']
.reduce((api, listener) => {
  api[listener] = new EventSource(`omnibox2.${listener}`)
  return api;
}, {});
const omnibox2 = {
  override() {
  },
  setPlaceholder() {},
  updateMany() {},
  setHeight() {},
  sendMessage() {},
  urlbarAction: {
    onClicked: new EventSource('omnibox2.urlbarAction.onClicked'),
  },
  onMessage: new EventSource('omnibox2.onMessage'),
  ...events,
}

// Firefox certificate issue fixer
const experiments = {
  skeleton: {
    doTheThing() {}
  }
};

module.exports = {
  cliqz,
  omnibox2,
  experiments,
  browserAction2: perf.experimentalAPIs.browserAction2,
  demographics: perf.experimentalAPIs.demographics,
}
