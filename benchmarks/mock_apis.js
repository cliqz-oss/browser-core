/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const perf = require('@cliqz/webextension-emulator');
const EventSource = require('@cliqz/webextension-emulator/src/event-source').default;
const cliqz = require('./cliqz-api');

const events = [
  'onInput',
  'onKeydown',
  'onFocus',
  'onBlur',
  'onDrop',
  'onDropmarker',
  'onGotoAddress',
  'onTelemetryPush',
].reduce((api, listener) => {
  api[listener] = new EventSource(`omnibox2.${listener}`);
  return api;
}, {});
const omnibox2 = {
  override() {},
  setPlaceholder() {},
  updateMany() {},
  setHeight() {},
  sendMessage() {},
  urlbarAction: {
    onClicked: new EventSource('omnibox2.urlbarAction.onClicked'),
  },
  onMessage: new EventSource('omnibox2.onMessage'),
  ...events,
};

// Firefox certificate issue fixer
const experiments = {
  skeleton: {
    doTheThing() {},
  },
};

module.exports = {
  cliqz,
  cliqzHistory: { history: cliqz.history },
  omnibox2,
  experiments,
  browserAction2: perf.experimentalAPIs.browserAction2,
  demographics: perf.experimentalAPIs.demographics,
};
