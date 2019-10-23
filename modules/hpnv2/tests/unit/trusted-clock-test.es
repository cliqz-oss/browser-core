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

const pako = require('pako');

const expect = chai.expect;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const MOCKED_PREFS = {
  _map: new Map(),
  _reset() { MOCKED_PREFS._map.clear(); },

  get(prefKey, notFound) {
    return MOCKED_PREFS._map.has(prefKey) ? MOCKED_PREFS._map.get(prefKey) : notFound;
  },
  set(prefKey, value) {
    MOCKED_PREFS._map.set(prefKey, value);
  },
};

export default describeModule('hpnv2/trusted-clock',
  () => ({
    'platform/lib/zlib': pako,
    'hpnv2/logger': {
      default: {
        debug() {},
        log() {},
        warn() {},
        error() {},
      }
    },
    'core/prefs': {
      default: {
        get: (...args) => MOCKED_PREFS.get(...args),
        set: (...args) => MOCKED_PREFS.set(...args),
      }
    },
  }),
  () => {
    describe('#TrustedClock', () => {
      let uut;
      let clock;

      beforeEach(function () {
        MOCKED_PREFS._reset();
        MOCKED_PREFS.set('config_ts', '20190128');

        clock = sinon.useFakeTimers(new Date('2019-01-28'));
        const TrustedClock = this.module().default;

        uut = new TrustedClock();
      });

      afterEach(function () {
        try {
          uut.unload();
        } catch (e) {
          // ignore
        }
        clock.restore();
        MOCKED_PREFS._reset();
      });

      const simulateWakingUpFromSuspend = (timeInMs) => {
        const saveOldTime = uut.minutesLocal;
        clock.tick(timeInMs);
        uut.minutesLocal = saveOldTime;
      };

      it('should support load and unload', function () {
        uut.init();
        uut.unload();

        // some more loads and unloads
        uut.init();
        uut.unload();
        uut.unload();
        uut.unload();
        uut.init();
        uut.init();
      });

      it('should only be in sync when it gets the first time stamp from the server', function () {
        uut.init();
        const start = new Date();

        expect(uut.checkTime().inSync).to.be.false;
        while (new Date() - start < 2 * DAY) {
          expect(uut.checkTime().inSync).to.be.false;
          clock.tick(20 * SECOND);
        }

        uut.syncWithServerTimestamp(new Date('2000-01-01'));
        expect(uut.checkTime().inSync).to.be.true;
        for (let i = 0; i < 60; i += 1) {
          clock.tick(6 * SECOND);
          expect(uut.checkTime().inSync).to.be.true;
        }
      });

      it('should normally stay in sync', function () {
        uut.init();

        const start = new Date('2019-01-28');
        uut.syncWithServerTimestamp(start);

        while (new Date() - start < 2 * DAY) {
          expect(uut.checkTime().inSync).to.be.true;
          clock.tick(20 * SECOND);
        }
        expect(uut.checkTime().inSync).to.be.true;
      });

      it('should detect when the system clock gets out of sync', function () {
        uut.init();

        let start = new Date('2019-01-28');
        uut.syncWithServerTimestamp(start);

        while (new Date() - start < 5 * MINUTE) {
          expect(uut.checkTime().inSync).to.be.true;
          clock.tick(20 * SECOND);
        }

        // simulate machine going for suspend for 9 hours and waking up
        simulateWakingUpFromSuspend(9 * HOUR);
        start = new Date();

        // without server timestamp, the clock should stay out of sync
        expect(uut.checkTime().inSync).to.be.false;
        while (new Date() - start < 2 * HOUR) {
          expect(uut.checkTime().inSync).to.be.false;
          clock.tick(20 * SECOND);
        }

        // simulate sync with server
        uut.syncWithServerTimestamp(new Date(Date.now() + 6 * MINUTE));
        start = new Date();

        // now the clock should be in sync again
        expect(uut.checkTime().inSync).to.be.true;
        while (new Date() - start < 2 * HOUR) {
          expect(uut.checkTime().inSync).to.be.true;
          clock.tick(20 * SECOND);
        }
      });

      it('should call #onClockOutOfSync if the clock is out of sync', function () {
        let called = false;
        uut.onClockOutOfSync = () => { called = true; };

        uut.init();
        uut.syncWithServerTimestamp(new Date());
        expect(called).to.be.false;
        uut.checkTime();
        expect(called).to.be.false;

        simulateWakingUpFromSuspend(9 * HOUR);
        uut.checkTime();
        expect(called).to.be.true;
      });

      it('should update "config_ts" when it gets out of sync', function () {
        expect(MOCKED_PREFS.get('config_ts')).not.equals('20020101');

        // the pref should automatically be synched with the
        // latest time from the server
        uut.init();
        uut.syncWithServerTimestamp(new Date('2002-01-01'));
        uut.checkTime();

        expect(MOCKED_PREFS.get('config_ts')).equals('20020101');

        // ... and from that on, it should be kept in sync automatically
        clock.tick(1 * DAY + 1 * HOUR);
        uut.checkTime();
        expect(MOCKED_PREFS.get('config_ts')).equals('20020102');
      });
    });
  });
