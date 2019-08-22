/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

const expect = chai.expect;
let handlerCalled = 0;
const dummyArg = 10;
const eventID = 'unitTestEvent';
const dummyEventHandler = function (_dummyArg) {
  handlerCalled = _dummyArg;
};

const intervals = [];
function registerInterval(interval) {
  intervals.push(interval);
}

function waitFor(fn) {
  let resolver;
  let interval;
  const promise = new Promise(function (res) {
    resolver = res;
  });

  function check() {
    const result = fn();
    if (result) {
      clearInterval(interval);
      resolver(result);
    }
  }

  interval = setInterval(check, 50);
  check();
  registerInterval(interval);

  return promise;
}

export default describeModule('core/events',
  function () {
    return {
      './console': {
        default: {}
      },
    };
  },
  function () {
    context('CliqzEvents tests', function () {
      let CliqzEvents;

      beforeEach(function () {
        CliqzEvents = this.module().default;
        handlerCalled = 0;
        CliqzEvents.sub(eventID, dummyEventHandler);
      });

      describe('Test event subscribe', function () {
        it('Handler is in event list', function () {
          expect(CliqzEvents.cache[eventID].length).to.be.above(0);
        });
      });

      describe('Test publish event', function () {
        it('Handler is called', function () {
          CliqzEvents.pub(eventID, dummyArg);
          return waitFor(function () {
            return handlerCalled === dummyArg;
          });
        });
      });

      describe('Two functions subscribed', function () {
        let fn1Called = 0;
        const fn1 = function () {
          fn1Called += 1;
        };
        let fn2Called = 0;
        const fn2 = function () {
          fn2Called += 1;
        };
        beforeEach(function () {
          fn1Called = 0;
          fn2Called = 0;
          CliqzEvents.sub(eventID, fn1);
          CliqzEvents.sub(eventID, fn2);
        });

        afterEach(function () {
          CliqzEvents.clean_channel(eventID);
        });

        it('calls all functions', function () {
          CliqzEvents.pub(eventID);
          return waitFor(function () {
            return fn1Called === 1 && fn2Called === 1;
          });
        });

        describe('Test function un_sub', function () {
          beforeEach(function () {
            CliqzEvents.un_sub(eventID, fn2);
          });

          it('Only calls one function', async function () {
            CliqzEvents.pub(eventID);
            await waitFor(function () {
              return fn1Called === 1;
            });
            chai.expect(fn2Called).to.equal(0);
          });
        });
      });
    });
  });
