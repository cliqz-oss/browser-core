const fs = require('fs');
const perf = require('@cliqz/webextension-emulator');
const experimentalAPIs = require('./mock_apis');

const Emulator = perf.default;

const emulator = new Emulator('../build', {
  injectWebextenionPolyfill: true,
  quiet: true,
  chromeStoragePath: './data/storage',
  indexedDBPath: './data/idb',
  timeMultiplier: 10,
});
Object.keys(experimentalAPIs).forEach((api) => {
  emulator.addChromeApi(api, experimentalAPIs[api]);
});
emulator.createSandbox();
emulator.mock.createTab({
  id: 3,
  active: true,
  title: 'Cliqz',
  url: 'https://cliqz.com',
});

process.on('unhandledRejection', (e) => {
  emulator._probe('errors.promiserejection', e.message + '\n' + e.stack);
});

emulator.startExtension();

setTimeout(() => {
  global.gc();
  emulator._probe('memory.heap', process.memoryUsage().heapUsed);
  Object.keys(emulator.sandbox.CLIQZ.app.modules).forEach((name) => {
    emulator._probe(`module.${name}.startup`, emulator.sandbox.CLIQZ.app.modules[name].loadingTime);
  });
}, 5000);

setTimeout(() => {
  global.gc();
  emulator._probe('memory.heap', process.memoryUsage().heapUsed);
  emulator.stopExtension();
  emulator.probeStorage();
  console.log(JSON.stringify(Object.assign({
    idb: perf.measureIdbSize(emulator),
  }, emulator.getProbeSummary())));
  fs.appendFileSync('./diagnostics.jl', JSON.stringify(emulator.probes))
  // force shutdown after 1s
  setTimeout(() => {
    process.exit();
  }, 1000);
}, 20000);
