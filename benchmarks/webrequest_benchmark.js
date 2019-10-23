/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const fs = require('fs');
const perf = require('@cliqz/webextension-emulator');
const readline = require('readline');
const experimentalAPIs = require('./mock_apis');

const sessionFile = process.argv[2];

const Emulator = perf.default;
const timeMultiplier = 10;
const emulator = new Emulator('../build/', {
  quiet: true,
  injectWebextenionPolyfill: true,
  chromeStoragePath: './data/storage',
  indexedDBPath: './data/idb',
  timeMultiplier,
});
Object.keys(experimentalAPIs).forEach((api) => {
  emulator.addChromeApi(api, experimentalAPIs[api]);
});

emulator.createSandbox();
emulator.startExtension();

const lineReader = readline.createInterface({
  input: fs.createReadStream(sessionFile),
});
const sequence = [
  'onBeforeRequest',
  'onBeforeSendHeaders',
  'onSendHeaders',
  'onHeadersReceived',
  'onResponseStarted',
  'onCompleted',
];
const WEBREQUEST_OPTIONS = {
  // Consider document requests as sub_document. This is because the request
  // dataset does not contain sub_frame or main_frame but only 'document' and
  // different blockers have different behaviours.
  document: 'main_frame',
  stylesheet: 'stylesheet',
  image: 'image',
  media: 'media',
  font: 'font',
  script: 'script',
  xhr: 'xmlhttprequest',
  fetch: 'xmlhttprequest',
  websocket: 'websocket',

  // other
  other: 'other',
  eventsource: 'other',
  manifest: 'other',
  texttrack: 'other',
};

process.on('unhandledRejection', (e) => {
  emulator._probe('errors.promiserejection', e.message);
});

const incognito = false;
const windowId = 1;
const tabId = 1;
emulator.chrome.windows.onCreated.trigger({
  id: windowId,
  incognito: false,
  alwaysOnTop: false,
  focused: true,
});
emulator.mock.createTab({
  id: tabId,
  active: true,
  title: 'Cliqz',
  url: 'https://cliqz.com',
  incognito,
  windowId,
});

let requestId = 1;
let tick = new Promise(resolve => setTimeout(resolve, 5000));

const subFrames = new Map();
let frameId = 1234;

const frameRegex = /([?=]|\.(html|js)|\/embed\/)/;

function isFrameUrl(url) {
  // guess if this is a frame
  return frameRegex.test(url);
}

lineReader.on('line', async (line) => {
  const { frameUrl, url, cpt } = JSON.parse(line);

  tick = tick.then(async () => {
    const obj = {
      frameId: 0,
      method: 'GET',
      originUrl: frameUrl,
      frameUrl,
      parentFrameId: -1,
      requestId,
      tabId,
      timeStamp: Date.now(),
      type: WEBREQUEST_OPTIONS[cpt],
      url,
    };
    if (cpt === 'document' && frameUrl === url && isFrameUrl(url)) {
      obj.type = 'sub_frame';
      frameId += 1;
      obj.frameId = frameId;
      subFrames.set(url, obj.frameId);
    } else if (subFrames.has(frameUrl)) {
      obj.frameId = subFrames.get(frameUrl);
    }
    if (obj.type === 'main_frame') {
      subFrames.clear();
      const navigation = {
        tabId,
        url,
        frameId: 0,
        parentFrameId: -1,
        timeStamp: Date.now(),
        transitionType: 'typed',
      };
      emulator.chrome.webNavigation.onBeforeNavigate.trigger(navigation);
      emulator.chrome.tabs.onUpdated.trigger(tabId, { url, status: 'loading' }, {
        id: tabId,
        url,
        incognito,
        active: true,
        windowId,
      });
      emulator.chrome.webNavigation.onCommitted.trigger(navigation);
    }
    for (let i = 0; i < sequence.length; i += 1) {
      const response = emulator.chrome.webRequest[sequence[i]].trigger(obj);
      if (response && (response.block || response.redirectUrl)) {
        emulator.chrome.webRequest.onErrorOccurred.trigger(obj);
        break;
      }
    }
    requestId += 1;
    if (requestId % 100 === 0) {
      // leave some ticks in between requests to allow extension timers to run.
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    if ((requestId % 10000) === 0) {
      global.gc();
      const usage = process.memoryUsage().heapUsed;
      emulator._probe('memory.heap', usage);
    }
  });
});

lineReader.on('close', async () => {
  await tick;
  emulator.stopExtension();
  emulator.probeStorage();
  console.log(JSON.stringify(emulator.getProbeSummary()));
  fs.appendFileSync('./diagnostics.jl', JSON.stringify(emulator.probes))
  setTimeout(() => {
    process.exit();
  }, 1000);
});
