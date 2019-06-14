/* global chai */
/* global describeModule */

const adblocker = require('@cliqz/adblocker');
const moment = require('moment');


let interval = null;
let timeout = null;

const TS = Date.now();
const URL = 'cliqz.com';
const visitsMock = [{ url: URL, ts: TS }];

let mapKeysMock = [];
let processedKeys = [];

function waitFor(fn) {
  let resolver;

  const promise = new Promise((res) => { resolver = res; });

  function check() {
    let result = false;

    try {
      result = fn();
    } catch (e) { /* Ignore */ }

    if (result) {
      clearInterval(interval);
      resolver(result);
    }
  }

  interval = setInterval(check, 50);
  check();

  return promise;
}


export default describeModule('history-analyzer/history-processor',
  () => ({
    'platform/lib/adblocker': {
      default: adblocker,
    },
    'platform/lib/moment': {
      default: moment,
    },
    'platform/history/history': {
      default: {
        queryVisitsForTimespan() {
          return visitsMock;
        },
      },
    },
    'core/persistence/map': {
      default: () => class PersistentMap {
        init() {}

        unload() {}

        destroy() {}

        set(key) { processedKeys.push(key); }

        keys() { return mapKeysMock; }

        values() { return mapKeysMock; }
      },
    },
    'core/services/pacemaker': {
      default: {
        everyFewSeconds(fn) {
          let enabled = true;
          const run = async () => {
            if (enabled) {
              try { await fn(); } catch (ex) { /* Ignore */ }
            }

            if (enabled) { timeout = setTimeout(run, 0); }
          };

          const stop = () => {
            enabled = false;
            clearTimeout(timeout);
          };

          timeout = setTimeout(run, 0);

          return { stop };
        },
        clearTimeout(t) { console.log('TIMEOUT?', t); if (t) { t.stop(); } },
      }
    },
    'core/url': {
      tryDecodeURI(url) { return url; },
    },
    'core/console': {
      isLoggingEnabled() { return false; },
      default: {
        warn() { },
        debug() { },
        log() { },
        error() { },
      },
    },
    'history-analyzer/logger': {
      default: {
        debug() { },
        log() { },
        error() { },
      }
    },
  }),
  () => {
    let ha = null;

    beforeEach(function () {
      const HistoryAnalyzer = this.module().default;
      ha = new HistoryAnalyzer();
    });

    afterEach(() => {
      ha.unload();
      clearInterval(interval);
      clearTimeout(timeout);
      processedKeys = [];
    });

    [
      [], // empty
      [null],
      [undefined],
      [42],
      [-1],
      [{}],
      [NaN],
    ].forEach((initialStorage) => {
      it(`Runs with initial storage: ${JSON.stringify(initialStorage)}`, async function () {
        mapKeysMock = initialStorage;
        const processedVisits = [];
        ha.on('processedVisits', (visits) => {
          processedVisits.push(...visits);
        });

        this.timeout(20000);
        await ha.init();
        await waitFor(() => processedKeys.length >= 100);
        ha.unload();

        // Validate dates
        for (let i = 0; i < processedKeys.length; i += 1) {
          const date = processedKeys[i];
          chai.expect(date).to.be.a('number');
          chai.expect(date).to.not.be.NaN;
        }

        // Validate processed visits
        for (let i = 0; i < processedVisits.length; i += 1) {
          const { ts, url, tokens } = processedVisits[i];
          chai.expect(ts).to.be.eql(TS);
          chai.expect(url).to.be.eql(URL);
          chai.expect(tokens).to.have.length(1);
        }
      });
    });
  });
