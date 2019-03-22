const fs = require('fs');
const perf = require('@cliqz/webextension-emulator');
const cliqzApi = require('./cliqz-api');
const readline = require('readline');

const sessionFile = process.argv[2];

const Emulator = perf.default;
const timeMultiplier = 100;
const emulator = new Emulator('../build/', {
  injectWebextenionPolyfill: true,
  quiet: true,
  chromeStoragePath: './data/storage',
  indexedDBPath: './data/idb',
  timeMultiplier,
});
Object.keys(perf.experimentalAPIs).forEach((api) => {
  emulator.addChromeApi(api, perf.experimentalAPIs[api]);
});
emulator.addChromeApi('cliqz', cliqzApi);

emulator.createSandbox();

const prefFile = './data/storage/storage_local.json';
fs.writeFileSync(prefFile, JSON.stringify({ cliqzprefs: { 'cliqz-adb': 1 }}));

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
  emulator._probe('errors.promiserejection', e.message + '\n' + e.stack);
});

const windowId = 1;
const tabId = 3;
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

let lines = [];
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
    await new Promise(resolve => setTimeout(resolve, 1));
  });
});

lineReader.on('close', async () => {
  await tick;
  lines.forEach(() => {
    const { frameUrl, url, cpt } = JSON.parse(line);
  })
  emulator.stopExtension();
  setTimeout(() => {
    process.exit();
  }, 1000);
});
