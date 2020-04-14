/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */
/* global sinon */
/* global describeModule */

const expect = chai.expect;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function unreliableNetwork(errorRate = 0.1) {
  return () => Math.random() >= errorRate;
}

const STABLE_NETWORK = () => true;

function createFakeConfig(ts, { sourceMapVersion = 0 } = {}) {
  const DUMMY_GROUP_PUB_KEY = 'GKZoZxvwueXjvnUF+Qxx9ioCkTSNmnqNhGiuRVpylhEk/ekvOPg7weqefm8Vl8LhBo260BSXgNUrCagzz8m31xsDtfijyib+Rc4TudIzcqJP0Q51/AwZZdfmKQzOWTR/G4WONgTi1wj/IbAy0HOfaCsmg1j8paYD/kjanO8bpmUjIkuQCaxYNRT6GUT4KGtqT1A0cFCt6OuDOqUdxJWVfwhozJIW5NI9Q8KnG+TxK0MKKI+IMTPW6Aewahpf8OYxGqWz/eDugmsvaVho1SAk9GBLumEETGY9tBtX+0vzJwYkSextu2z1+zhlbxMbJLKsPrcQ/SaPHEnx6A3PvFrt/xS+QdT9pNS05FjRjm0Yd3v1JwYrdi6TwL0uf2RLfJ5mEe2OC8jPynBK/OSKrZ27cBg/2T0Z4xWhfCkYxOI3RqsPTo/nkXmZXkyUFzH+F8XFRl9qtbAw+i/kGEdOYI2wERHuBFtacs1+y6hObYoarGNaJufpx6Y/wdWQr0L2mi6d';
  const DUMMY_PUB_KEY = 'BNA4mKegSpi1CMU4Y1AsaxUWfzwvtnBaoUbucfqdQvFwDFpoZk/26lEvPXDYiBLAGY7Jvj1mFsW4wVV0oDTHZ/o=';

  const config = {
    minVersion: 1,
    ts: ts.toISOString(),
    groupPubKeys: {},
    pubKeys: {},
    sourceMap: {
      actions: {}
    },
  };

  config.sourceMap.actions[`dummyEvent_v${sourceMapVersion}`] = {
    keys: [
      't->url'
    ],
  };

  // fill keys for yesterday, today, tomorrow, day-after-tomorrow
  for (let dayDiff = -1; dayDiff <= 2; dayDiff += 1) {
    const day = new Date(ts.getTime() + dayDiff * DAY);
    const yyyymmdd = day.toISOString().replace(/[^0-9]/g, '').slice(0, 8);
    config.groupPubKeys[yyyymmdd] = DUMMY_GROUP_PUB_KEY;
    config.pubKeys[yyyymmdd] = DUMMY_PUB_KEY;
  }
  return config;
}

function createEndpointStub() {
  const _stats = {
    calls: {
      getConfig: 0,
      getServerTimestamp: 0,
    },
  };
  const _network = {
    availability: STABLE_NETWORK
  };
  let sourceMapVersion = 0;
  return {
    _stats,
    _changeSourceMap() { sourceMapVersion += 1; },
    _network,
    async getConfig(fields) {
      _stats.calls.getConfig += 1;
      const now = new Date();
      if (_network.availability(now)) {
        let config = createFakeConfig(now, { sourceMapVersion });
        if (fields) {
          // only select the requested fields
          config = Object.assign({}, ...fields.split(',').map(field => ({ [field]: config[field] })));
        }
        return JSON.stringify(config);
      }
      throw Error('Simulated network is down.');
    },
    async getServerTimestamp() {
      _stats.calls.getServerTimestamp += 1;
      const now = new Date();
      if (_network.availability(now)) {
        return now.toISOString();
      }
      throw Error('Simulated network is down.');
    }
  };
}

export default describeModule('hpnv2/config-loader',
  () => ({
    './logger': {
      default: {
        debug() {},
        log() {},
        warn() {},
        error() {},
      },
    },
    'core/services/pacemaker': {
      default: {
        setTimeout(...args) { return setTimeout(...args); },
        clearTimeout(...args) { return clearTimeout(...args); },
      }
    },
    '../core/crypto/random': {
      default: Math.random,
    },
  }),
  () => {
    describe('#ConfigLoader', () => {
      let uut;
      let clock;
      let endpoints;

      beforeEach(function () {
        clock = sinon.useFakeTimers(new Date('2019-01-28'));
        endpoints = createEndpointStub();

        const ConfigLoader = this.module().default;
        uut = new ConfigLoader(endpoints);
      });

      afterEach(function () {
        try {
          uut.unload();
        } catch (e) {
          // ignore
        }
        clock.restore();
      });

      it('should support load and unload', function () {
        uut.init();
        uut.unload();
        uut.init();
        uut.unload();

        uut.unload();
        uut.unload();
        uut.init();
        uut.unload();
      });

      it('should fetch the config when initially calling #fetchConfig', async () => {
        const configs = [];
        uut.onConfigUpdate = (config) => { configs.push(config); };

        uut.init();
        await uut.fetchConfig();

        expect(configs.length).to.equal(1);
      });

      it('should multiple fetch calls should not interfere', async () => {
        const configs = [];
        uut.onConfigUpdate = (config) => { configs.push(config); };

        uut.init();
        await Promise.all([uut.fetchConfig(), uut.fetchConfig(), uut.fetchConfig()]);

        expect(configs.length).to.equal(1);
      });

      describe('#synchronizeClocks', function () {
        it('should eventually call #onServerTimestampRefresh', async () => {
          const serverTsReceived = [];
          uut.onServerTimestampRefresh = (serverTs) => {
            serverTsReceived.push(serverTs);
          };

          uut.init();
          await uut.synchronizeClocks();

          expect(serverTsReceived.length).to.equal(1);
        });
      });

      describe('when simulating updates over multiple days', function () {
        /**
         * Runs a simulation and measures how many times the configuration
         * would have been fetched and how often the callback to signal
         * a change was triggered.
         *
         * Parameters:
         *
         * totalDurationInMs:
         *   how much time should be covered in the simulation?
         *
         * minutesPerTick:
         *   increasing this value will make the simulation run faster, but it will be less precise
         *
         * sourceMapChangeFrequencyInMin:
         *   0 means the source map will not change; otherwise, it will be the period in minutes
         *   in which a change to the source map will be introduced.
         *
         * networkErrorRate:
         *   0 means all network connections will succeed; otherwise, it is the likelihood of
         *   request to fail during the simulation
         */
        const impl = async ({
          minutesPerTick = 1,
          totalDurationInMs = 10 * DAY,
          sourceMapChangeFrequencyInMin = 0,
          networkErrorRate = 0,
        } = {}) => {
          const configs = [];
          uut.onConfigUpdate = (config) => { configs.push(config); };

          endpoints._network.availability = unreliableNetwork(networkErrorRate);

          uut.init();
          await uut.fetchConfig();

          // approximate number of changes:
          // within 10 days, we should normally see 11 different configs
          let sourceMapChanges = 0;
          const days = new Set();

          const start = new Date();
          let minutesElapsed = 0;
          let nextSourceMapChange = sourceMapChangeFrequencyInMin;

          while (new Date() - start <= totalDurationInMs) {
            minutesElapsed += minutesPerTick;
            clock.tick(minutesPerTick * MINUTE);
            days.add(new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 8));

            if (sourceMapChangeFrequencyInMin > 0 && minutesElapsed >= nextSourceMapChange) {
              endpoints._changeSourceMap();
              sourceMapChanges += 1;

              const freq = sourceMapChangeFrequencyInMin;
              nextSourceMapChange = (1 + Math.floor(minutesElapsed / freq)) * freq;
            }

            // give the timers a chance to run
            /* eslint-disable no-await-in-loop */
            await Promise.resolve();
          }
          const daysSeen = days.size;

          if (networkErrorRate < 1.0) {
            // verify whether the number of different configurations that
            // has been seen is realistic:
            const changeTolerance = 2;
            const minExpectedChanges = 0.95 * daysSeen
                  + (0.7 * sourceMapChanges) * (1 - networkErrorRate) - changeTolerance;
            const maxExpectedChanges = daysSeen + sourceMapChanges;
            expect(configs.length).to.be.within(minExpectedChanges, maxExpectedChanges,
              'Got an unusual number of different configurations during the simulation');

            // verify whether the number of requests made is realistic:
            const requestTolerance = 1;
            const minExpectedRequests = 0.8
                  * (totalDurationInMs / uut.loadConfigSuccessMaxInterval) - requestTolerance;
            const maxExpectedRequests = (totalDurationInMs / uut.loadConfigSuccessMinInterval + 1)
                  * (1 / networkErrorRate);
            expect(endpoints._stats.calls.getConfig).to.be.within(
              minExpectedRequests, maxExpectedRequests,
              'Made an unusual number of requests the simulation'
            );
          }
        };

        it('one hour, no source map changes', async () => {
          await impl({
            totalDurationInMs: 1 * HOUR,
            sourceMapChangeFrequencyInMin: 0, // source map will not be changed
          });
        });

        it('10 days, frequent changes to source map', async () => {
          await impl({
            totalDurationInMs: 10 * DAY,
            minutesPerTick: 5,
            sourceMapChangeFrequencyInMin: 3 * 57, // about one per 3 hours
          });
        });

        it('one year, occasional changes to source map, perfect network', async () => {
          await impl({
            totalDurationInMs: 365 * DAY,
            minutesPerTick: 60,
            sourceMapChangeFrequencyInMin: 12 * DAY + 53 * MINUTE,
          });
        });

        it('one year, occasional changes to source map, unstable network', async () => {
          await impl({
            totalDurationInMs: 365 * DAY,
            minutesPerTick: 60,
            sourceMapChangeFrequencyInMin: 12 * DAY + 53 * MINUTE,
            networkErrorRate: 0.1,
          });
        });

        it('one year, occasional changes to source map, almost broken network', async () => {
          await impl({
            totalDurationInMs: 365 * DAY,
            minutesPerTick: 60,
            sourceMapChangeFrequencyInMin: 12 * DAY + 53 * MINUTE,
            networkErrorRate: 0.8,
          });
        });
      });
    });
  });
