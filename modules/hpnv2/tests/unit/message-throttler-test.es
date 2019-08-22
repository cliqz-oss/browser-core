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

function fakeTrustedClock({ uptimeInMin = 5, midnightSpike = false } = {}) {
  return {
    midnightSpikeDanger() { return midnightSpike; },
    estimateHpnUptime() { return uptimeInMin; },
  };
}

const SOME_ACTION = 'dummy-action';
function fakeMessage(action = SOME_ACTION) {
  return {
    action
  };
}

function fakeSourceMap() {
  return {
    actions: {}
  };
}

export default describeModule('hpnv2/message-throttler',
  () => ({
    './logger': {
      default: {
        debug() {},
        log() {},
        warn() {},
        error() {},
      }
    },
    'core/services/pacemaker': {
      default: {
        setTimeout(...args) { return setTimeout(...args); },
        clearTimeout(...args) { return clearTimeout(...args); },
      },
    },
    'core/crypto/random': {
      default: Math.random.bind(Math),
    },
  }),
  () => {
    describe('#MessageThrottler', () => {
      let uut;
      let clock;

      beforeEach(function () {
        clock = sinon.useFakeTimers(new Date('2019-01-28'));
        const MessageThrottler = this.module().default;

        uut = new MessageThrottler();
      });

      afterEach(function () {
        uut.cancelPendingTimers();
        clock.restore();
      });

      describe('when no rules are given', () => {
        it('should never delay', async function () {
          const msg = fakeMessage();
          const promise = uut.startRequest(msg, fakeTrustedClock());
          await promise;
          uut.endRequest(msg);
        });
      });

      describe('with default throttling rules with minDelay=0', () => {
        const maxDelay = 60;
        beforeEach(function () {
          const defaultRules = {
            default: {
              minDelay: 0,
              maxDelay,
            }
          };
          uut.updateConfig({
            normal: defaultRules,
            midnight: defaultRules,
          }, fakeSourceMap());
        });

        it('should not throttle on the first message', async function () {
          const start = Date.now();
          await uut.startRequest(fakeMessage(), fakeTrustedClock());
          expect(Date.now()).to.equal(start);
        });

        it('should start throttling when multiple messages are sent', async function () {
          const start = Date.now();
          const promises = [];
          const trustedClock = fakeTrustedClock({ uptimeInMin: 30 * DAY });

          for (let i = 0; i < 100; i += 1) {
            promises.push(uut.startRequest(fakeMessage(), trustedClock).then(() => {
              const elapsedSec = Date.now() - start;
              expect(elapsedSec).to.be.at.most(maxDelay);
            }));
          }
          clock.runAll();
          await Promise.all(promises);

          const elapsedSec = Date.now() - start;
          expect(elapsedSec).to.be.at.most(maxDelay);

          // After sending a few messages, the delay should almost converge to the
          // configured max Delay. That means each trial has almost a 50% to take longer
          // than maxDelay / 2. As we have 100 trials, loosing so many coin flips
          // in a row should be extremely unlikely.
          expect(elapsedSec).to.be.at.least(maxDelay / 2);
        });


        it('should not delay when different types of messages are sent very rarely', async function () {
          const send = async (action) => {
            const msg = fakeMessage(action);
            try {
              await uut.startRequest(msg, fakeTrustedClock({ uptimeInMin: 30 * DAY }));
            } finally {
              uut.endRequest(msg);
            }
          };

          for (let minute = 0; minute <= 24 * 60; minute += 1) {
            const start = Date.now();
            const promises = [];
            if (minute % 37 === 0) {
              promises.push(send('ACTION_1'));
            }
            if (minute % 51 === 0) {
              promises.push(send('ACTION_2'));
            }
            if (minute % 53 === 0) {
              promises.push(send('ACTION_3'));
            }

            /* eslint-disable no-await-in-loop */
            await Promise.all(promises);
            const elapsedSec = Date.now() - start;
            expect(elapsedSec).to.equal(0);

            clock.tick(1 * MINUTE);
            clock.runAll();
          }
        });
      });
    });
  });
