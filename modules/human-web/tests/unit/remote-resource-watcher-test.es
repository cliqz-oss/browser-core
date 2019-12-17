/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-await-in-loop */

/* global chai */
/* global sinon */
/* global describeModule */

const expect = chai.expect;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// (single producer, single consumer only)
class WaitableQueue {
  constructor() {
    this.list = [this._newEntry()];
  }

  _newEntry() {
    const entry = {};
    entry.isReady = new Promise((resolve) => {
      entry.markAsReady = resolve;
    });
    return entry;
  }

  async get() {
    await this.list[0].isReady;
    return this.list.shift().value;
  }

  push(value) {
    const last = this.list[this.list.length - 1];
    last.value = value;
    this.list.push(this._newEntry());
    last.markAsReady();
  }
}

class AbortControllerMock {
  constructor() {
    this.signal = {};
    this.signal._waitOnAbort = new Promise((resolve, reject) => {
      this.signal._abort = resolve;
      this.signal._destroy = reject;
    });
  }

  abort() {
    this.signal._abort();
  }
}

const CONTENT_URL = 'https://some-domain.test/some-path-to-resource';
const SIGNATURE_URL = 'https://some-domain.test/some-path-to-signature';

const MOCKS = {
  reset() {
    this.prefs = new Map();
    this.fetch = async () => ({
      ok: false,
      statusText: 'Unexpected call to fetch',
    });
    this._intervalTimers = new Set();
    this.storage = null;
  },
  prefs: new Map(),

  // helpers to simulate pacemaker.clearTimeout
  // (will be flushed after each test)
  _intervalTimers: new Set(),
  setInterval(...args) {
    const timer = setInterval(...args);
    this._intervalTimers.add(timer);
    return timer;
  },
  setTimeout(...args) {
    setTimeout(...args);
  },
  clearTimeoutOrInterval(timer) {
    if (this._intervalTimers.delete(timer)) {
      clearInterval(timer);
    } else {
      clearTimeout(timer);
    }
  },

  // mocks "fetch" API called:
  setupFetch(mockedResponse) {
    this.fetch = (url, { signal }) => {
      let type;
      if (url === CONTENT_URL) {
        type = 'content';
      } else if (url === SIGNATURE_URL) {
        type = 'signature';
      } else {
        throw new Error(`Unexpected URL: ${url}`);
      }
      const {
        error,
        body = '',
        minLatencyInMs = 0,
        maxLatencyInMs = 0,
        networkErrorRate = 0.0,
      } = mockedResponse({ url, type }) || {};

      return new Promise((resolve, reject) => {
        let latency = minLatencyInMs;
        if (maxLatencyInMs > minLatencyInMs) {
          latency += Math.round(Math.random() * (maxLatencyInMs - minLatencyInMs));
        }
        const timeout = setTimeout(() => {
          if (error || (networkErrorRate > 0.0 && networkErrorRate >= Math.random())) {
            resolve({
              ok: false,
              statusText: 'Simulated error when trying to fetch resource',
            });
          } else {
            resolve({
              ok: true,
              statusText: 'OK',
              async text() { return body; },
              async arrayBuffer() { return Buffer.from(body); },
            });
          }
          signal._destroy();
        }, latency);
        if (signal) {
          signal._waitOnAbort.then(() => {
            reject(new Error('Request was aborted'));
            clearTimeout(timeout);
          }).catch(() => {});
        }
      });
    };
  }
};

class StorageStub {
  constructor() {
    MOCKS.storage = this;
  }

  async load() {
    if (!this.isDefined) {
      throw new Error('all initial loads before the first write are expected to fail');
    }
    return this.content;
  }

  async save(content) {
    this.content = content;
    this.isDefined = true;

    // hook for tests
    if (this.onSave) {
      this.onSave(content);
    }
  }
}

const VERBOSE = false;
function wrapLog(log) {
  return VERBOSE ? log : (() => {});
}

// Given a sorted list of timestamps, it verifies that the
// maximum number of events within the given time interval
// never exceeded the given threshold.
function expectNoBursts(events, maxEvents, interval) {
  if (interval <= 0) {
    throw new Error('Interval must be non-empty');
  }

  let start = 0;
  for (let end = 0; end < events.length; end += 1) {
    while (start < end && events[start] + interval < events[end]) {
      start += 1;
    }
    const eventsInInterval = end - start + 1;
    if (eventsInInterval > maxEvents) {
      chai.assert.fail(`Expected no more than ${maxEvents} events within ${interval / 1000} seconds `
        + `but got ${eventsInInterval} (or more) during ${new Date(events[start])} and ${new Date(events[end])})`);
    }
  }
}

export default describeModule('human-web/remote-resource-watcher',
  () => ({
    'core/logger': {
      default: {
        get() {
          return {
            debug: wrapLog(console.debug),
            log: wrapLog(console.log),
            info: wrapLog(console.log),
            warn: wrapLog(console.warn),
            error: wrapLog(console.error),
          };
        },
      },
    },
    'platform/resource-loader-storage': {
      default: StorageStub,
    },
    'platform/globals': {},
    'core/zlib': {},
    'core/http': {},

    'core/prefs': {
      default: {
        set(key, val) {
          MOCKS.prefs.set(key, val);
        },
        get(key, def) {
          return MOCKS.prefs.get(key) || def;
        }
      },
    },

    'core/services/pacemaker': {
      default: {
        setTimeout(...args) {
          return MOCKS.setTimeout(...args);
        },
        everyFewMinutes(args) {
          return MOCKS.setInterval(args, 10 * MINUTE);
        },
        nextIdle(args) {
          return MOCKS.setTimeout(args, 0);
        },
        clearTimeout(timer) {
          MOCKS.clearTimeoutOrInterval(timer);
        },
      },
    },

    '../core/http': {
      fetch: (...args) => MOCKS.fetch(...args),
      AbortController: AbortControllerMock,
    },

  }),
  () => {
    describe('#RemoteResourceWatcher', function () {
      let RemoteResourceWatcher;
      let clock;
      let uut;

      function getDefaultOptions() {
        return {
          moduleName: 'some-test-module',
          resource: {
            url: CONTENT_URL,
            id: 'some-test-resource',
          },
          signature: {
            url: SIGNATURE_URL,
            verifier: {
              async checkSignature() {
                wrapLog(console.log)('[STUB]: Trusting all signatures');
                return true;
              },
            },
          },
          onUpdate: () => {},
        };
      }

      beforeEach(function () {
        MOCKS.reset();
        clock = sinon.useFakeTimers(new Date('2019-10-21'));

        RemoteResourceWatcher = this.module().RemoteResourceWatcher;
      });

      afterEach(function () {
        clock.restore();
        MOCKS.reset();
        if (uut) {
          try {
            uut.unload();
          } catch (e) {
            //
          }
        }
      });

      [
        // ideal network environment:
        { minLatencyInMs: 0, maxLatencyInMs: 0, networkErrorRate: 0.0 },

        // high latency, no errors:
        { minLatencyInMs: 15000, maxLatencyInMs: 90000, networkErrorRate: 0.0 },

        // some latency and occasional errors:
        { minLatencyInMs: 50, maxLatencyInMs: 10000, networkErrorRate: 0.02 },

        // no latency, high error rate:
        { minLatencyInMs: 0, maxLatencyInMs: 0, networkErrorRate: 0.3 },

        // almost broken network (in practice, this would be unusable):
        { minLatencyInMs: 500, maxLatencyInMs: 60000, networkErrorRate: 0.75 },

      ].forEach((networkSettings) => {
        describe(`(network: ${JSON.stringify(networkSettings)})`, function () {
          const perfectNetwork = networkSettings.minLatencyInMs === 0
            && networkSettings.maxLatencyInMs === 0
            && networkSettings.networkErrorRate === 0.0;

          it('should allow load/unload', async function () {
            uut = new RemoteResourceWatcher(getDefaultOptions());

            await uut.init();
            uut.unload();

            await uut.init();
            uut.unload();
            uut.unload();
            uut.unload();

            await uut.init();
            uut.unload();
          });

          /**
           * After a new installation, it should fetch the content
           * from the network. The time window in which no data exists
           * should be fairly low.
           *
           * In the end, the content that has been loaded from the network
           * should get persisted on disk.
           *
           * Assumptions:
           * - The network is fast and reliable.
           * - Verification always passes.
           */
          it('should load patterns on the first startup', async function () {
            this.timeout(30000);
            const CONTENT_FROM_NETWORK = 'mocked content';

            MOCKS.setupFetch(() => ({
              ...networkSettings,
              body: CONTENT_FROM_NETWORK,
            }));

            const options = getDefaultOptions();
            let gotUpdate = false;
            let content;

            const start = Date.now();
            let elapsedSimulatedTime;
            options.onUpdate = (content_) => {
              gotUpdate = true;
              elapsedSimulatedTime = Date.now() - start;
              content = content_;
            };

            uut = new RemoteResourceWatcher(options);

            // install callback to verify that the state gets
            // persisted at the end
            const stateIsEventuallyPersistedOnDisk = new Promise((resolve, reject) => {
              uut.storage.onSave = (persistedContent) => {
                try {
                  if (persistedContent && Buffer.from(persistedContent, 'utf8').toString() === CONTENT_FROM_NETWORK) {
                    resolve();
                    return;
                  }
                } catch (e) {
                  //
                }
                reject(new Error('State was not properly persisted'));
              };
            });

            await uut.init();

            while (!gotUpdate) {
              await (async () => {});
              clock.tick(perfectNetwork ? 10 : 1000);
            }

            const stringContent = Buffer.from(content, 'utf8').toString();
            expect(stringContent).to.equal(CONTENT_FROM_NETWORK);

            if (perfectNetwork) {
              // Note that the timing that we got here is expected to be slightly higher
              // that normal (depending on coarse-grained the clock runs). Still, it
              // should update fairly quickly after extension start under this lab conditions
              // (no latency).
              expect(elapsedSimulatedTime).to.be.below(5 * SECOND);
            }

            // make sure that the loaded content is still available
            // after an extension restart
            await stateIsEventuallyPersistedOnDisk;

            // finally, after unload all timers must be cleared
            uut.unload();
            clock.runAll();
          });

          /**
           * The last verified state should be persisted to the disk.
           * After initialization, it should immediately output a value.
           *
           * Afterwards, normal updates should be performed and eventually
           * it should output a new state from the network.
           *
           * Assumptions:
           * - the storage starts with an existing value
           */
          it('should start with patterns from disk', async function () {
            this.timeout(30000);

            // expectation: First, we should see the content loaded from
            // the disk, but later the content from the network
            const CONTENT_FROM_DISK = 'mocked content from disk';
            const CONTENT_FROM_NETWORK = 'mocked content from network';

            MOCKS.setupFetch(() => ({
              ...networkSettings,
              body: CONTENT_FROM_NETWORK,
            }));
            const options = getDefaultOptions();

            const start = Date.now();
            const updateCalls = new WaitableQueue();
            options.onUpdate = (content) => {
              updateCalls.push({
                content: Buffer.from(content, 'utf8').toString(),
                elapsed: Date.now() - start,
              });
            };

            uut = new RemoteResourceWatcher(options);
            await MOCKS.storage.save(new Uint8Array(Buffer.from(CONTENT_FROM_DISK)));

            const pendingInit = uut.init();

            const firstUpdate = await updateCalls.get();
            expect(firstUpdate.content).to.equal(CONTENT_FROM_DISK);
            expect(firstUpdate.elapsed).to.be.below(1 * SECOND);

            await pendingInit;
            clock.runToLast();

            let done = false;
            const forceProgressLoop = (async () => {
              while (!done) {
                await (async () => {});
                clock.tick(perfectNetwork ? 10 : 1000);
              }
            })();

            const secondUpdate = await updateCalls.get();
            done = true;
            expect(secondUpdate.content).to.equal(CONTENT_FROM_NETWORK);
            if (perfectNetwork) {
              expect(secondUpdate.elapsed).to.be.below(2 * HOUR);
            }

            await forceProgressLoop;
          });

          /**
           * Checks that we can recover from failed verifications.
           *
           * Test setup:
           * - every four hours, the message and signature changes (buckets: { 0, ..., 6 })
           * - the mock verifier will only accept messages and signatures from the
           *   same hour, and only for even buckets ({ 0, 2, 4, 6 }). Everything else
           *   will be treated as forged signatures.
           *
           * Given enough time, it should get successful updates for each of these
           * four messages.
           */
          it('should only accept resources with correct signatures', async function () {
            this.timeout(30000);

            const ALL_BUCKETS = [0, 1, 2, 3, 4, 5, 6];
            const GOOD_BUCKETS = [0, 2, 4, 6];

            MOCKS.setupFetch(({ type }) => {
              const bucket = Math.round((new Date().getUTCHours()) / 4);
              expect(ALL_BUCKETS).to.include(bucket);
              return {
                ...networkSettings,
                body: JSON.stringify({ type, bucket }),
              };
            });
            const options = getDefaultOptions();
            options.signature.verifier = {
              async checkSignature(message, signature) {
                const msg = JSON.parse(Buffer.from(message, 'utf8').toString());
                const sig = JSON.parse(signature);

                return msg.type === 'content' && sig.type === 'signature'
                  && msg.bucket === sig.bucket && GOOD_BUCKETS.includes(msg.bucket);
              },
            };

            const updateCalls = new WaitableQueue();
            options.onUpdate = (content) => {
              updateCalls.push(Buffer.from(content, 'utf8').toString());
            };

            uut = new RemoteResourceWatcher(options);
            await uut.init();

            let done = false;
            const forceProgressLoop = (async () => {
              while (!done) {
                await (async () => {});
                clock.tick(1 * MINUTE);
              }
            })();

            const seen = [];
            let lastSeen;
            while (seen.length < GOOD_BUCKETS.length) {
              const { type, bucket } = JSON.parse(await updateCalls.get());
              expect(type).to.equal('content');
              expect(GOOD_BUCKETS).to.include(bucket);
              expect(bucket).not.to.equal(lastSeen, 'updates must differ');

              if (!seen.includes(bucket)) {
                seen.push(bucket);
              }
              lastSeen = bucket;
            }
            done = true;
            expect(seen).to.have.same.members(GOOD_BUCKETS);

            await forceProgressLoop;
          });

          /**
           * Simulates one year of updates. The expectation is that
           * updates should stay in the boundaries defined by "maxAge",
           * which is normally one hour.
           */
          describe('should detect new updates "maxAge" parameter', function () {
            const lowErrorRate = networkSettings.networkErrorRate < 0.1;
            const highErrorRate = networkSettings.networkErrorRate > 0.5;

            // A normal internet connection should not fall into the lowErrorRate
            // category. The worse the connection gets, the harder it gets to meet
            // the requestedMaxAge (unless you would make a huge number of requests,
            // which would have obvious drawbacks).
            //
            // For practical purposes, the most important constellation is
            // maxAge of one hour with a good internet connection. If the client
            // runs non-stop, we expect that the resource never gets more outdated
            // than two hours.
            //
            // The cases with high error rate should be less relevant in practice.
            // You can treat them as a worst-case scenario, but in reality, it is
            // much more likely that you are mostly in the low error rate category.
            // For example, if the error rate is 75%, missing all daily attempts
            // for two weeks is 1.8%. For 60 days, the chances go down to about
            // once in 300 million runs.
            [
              { maxAge: 1 * HOUR, low: 2 * HOUR, medium: 24 * HOUR, high: 60 * DAY },
              { maxAge: 1 * DAY, low: 26 * HOUR, medium: 32 * HOUR, high: 60 * DAY },
            ].forEach(({ maxAge, low, medium, high }) => {
              it(`(with maxAge: ${maxAge / HOUR} hours)`, async function () {
                this.timeout(30000);

                const simulationDuration = 365 * DAY;

                let expectedMaxTimeThreshold;
                if (lowErrorRate) {
                  expectedMaxTimeThreshold = low;
                } else if (highErrorRate) {
                  expectedMaxTimeThreshold = high;
                } else {
                  expectedMaxTimeThreshold = medium;
                }

                MOCKS.setupFetch(() => ({
                  ...networkSettings,
                  body: Date.now().toString(),
                }));
                const options = getDefaultOptions();
                options.caching = options.caching || {};
                options.caching.maxAge = maxAge;

                const updateCalls = new WaitableQueue();
                options.onUpdate = (content) => {
                  updateCalls.push(Buffer.from(content, 'utf8').toString());
                };

                uut = new RemoteResourceWatcher(options);
                await uut.init();

                let lastTimestamp = Date.now();
                const tooOld = () => {
                  const elapsedSinceLastTs = Date.now() - lastTimestamp;
                  return elapsedSinceLastTs >= expectedMaxTimeThreshold;
                };

                let done = false;
                const forceProgressLoop = (async () => {
                  while (!done) {
                    await (async () => {});
                    clock.tick(1 * MINUTE);

                    if (tooOld()) {
                      updateCalls.push(`too-old (last: ${new Date(lastTimestamp)}, now: ${new Date()})`);
                      done = true;
                    }
                  }
                })();

                const start = Date.now();
                while (Date.now() - start < simulationDuration) {
                  const update = await updateCalls.get();
                  if (update.startsWith('too-old')) {
                    chai.assert.fail(`threshold exceeded: failed to see new updates fast enough: ${update}`);
                  }

                  const updateTs = Number.parseInt(update, 10);
                  lastTimestamp = updateTs;
                }

                done = true;
                await forceProgressLoop;
              });
            });
          });
        });
      });


      /**
       * Intended to detect edge cases that could lead to uncontrolled resource usage,
       * either network (making too many request) or CPU (too many verifications).
       *
       * To simulate edge cases, focus on the error recovery. This test is intended to protect
       * against implementations that gets overly aggressively during retries.
       */
      describe('should not use too many resources (network, CPU)', function () {
        [
          // good cases (clients should normally be in this category):
          // - signatures are always correct
          // - network connection is stable
          {
            signatureFailRate: 0.0,
            minLatencyInMs: 0,
            maxLatencyInMs: 0,
            networkErrorRate: 0.0
          },
          {
            signatureFailRate: 0.0,
            minLatencyInMs: 100,
            maxLatencyInMs: 20000,
            networkErrorRate: 0.02
          },

          // network is down
          {
            signatureFailRate: 0.0,
            minLatencyInMs: 0,
            maxLatencyInMs: 0,
            networkErrorRate: 1.0
          },

          // server pushed wrong signature (or wrong signature is still cached)
          {
            signatureFailRate: 1.0,
            minLatencyInMs: 0,
            maxLatencyInMs: 0,
            networkErrorRate: 0.0
          },

          // network down and corrupted signatures
          {
            signatureFailRate: 1.0,
            minLatencyInMs: 0,
            maxLatencyInMs: 0,
            networkErrorRate: 1.0
          },

          // expect all operations to hang to fail randomly
          {
            signatureFailRate: 0.5,
            minLatencyInMs: 20000,
            maxLatencyInMs: 60000,
            networkErrorRate: 0.9
          },
        ].forEach(({ signatureFailRate, ...networkSettings }) => {
          it(`(${JSON.stringify({ signatureFailRate, ...networkSettings })})`, async function () {
            this.timeout(30000);

            const simulationDuration = 7 * DAY;
            const requestHistory = [];
            const verifyHistory = [];

            MOCKS.setupFetch(() => {
              const now = Date.now();
              requestHistory.push(now);

              return {
                ...networkSettings,
                body: now.toString(),
              };
            });
            const options = getDefaultOptions();
            options.signature.verifier = {
              async checkSignature() {
                verifyHistory.push(Date.now());
                return signatureFailRate <= Math.random();
              },
            };

            uut = new RemoteResourceWatcher(options);
            await uut.init();

            const started = Date.now();

            // eslint-disable-next-line no-constant-condition
            while (true) {
              const elapsed = Date.now() - started;
              if (elapsed > simulationDuration) {
                break;
              }

              await (async () => {});

              // trade-off speed vs precision:
              // After a while, start advancing the clock faster to speed
              // up the simulation. Be aware that it will reduce the precision
              // and it might overlook bursts that happen later.
              const precise = elapsed < 1 * HOUR;
              clock.tick(precise ? 50 : MINUTE);
            }

            expectNoBursts(requestHistory, 2, SECOND);
            expectNoBursts(requestHistory, 4, MINUTE);
            expectNoBursts(requestHistory, 30, HOUR);
            expectNoBursts(requestHistory, 50, 4 * HOUR);
            expectNoBursts(requestHistory, 150, DAY);

            expectNoBursts(verifyHistory, 2, SECOND);
            expectNoBursts(verifyHistory, 4, MINUTE);
            expectNoBursts(verifyHistory, 30, HOUR);
            expectNoBursts(verifyHistory, 50, 4 * HOUR);
            expectNoBursts(verifyHistory, 150, DAY);
          });
        });
      });
    });
  });
