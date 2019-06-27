const fs = require('fs');
const perf = require('@cliqz/webextension-emulator');
const readline = require('readline');
const experimentalAPIs = require('./mock_apis');

const sessionFile = process.argv[2];

const Emulator = perf.default;
const timeMultiplier = 10;
const emulator = new Emulator('../build/', {
  injectWebextenionPolyfill: true,
  quiet: true,
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
]
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
  incognito: false,
  windowId,
});

let requestId = 1;
let tick = new Promise(resolve => setTimeout(resolve, 5000));

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
      isPrivate: false,
    };
    for (let i = 0; i < sequence.length; i++) {
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
