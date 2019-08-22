/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */
const tldts = require('tldts-experimental');
const moment = require('moment');
const mockDexie = require('../../core/unit/utils/dexie');

const prefs = new Map();

const mockApps = {
  1: {
    name: 'Tracker 1',
    cat: 'tracker',
  },
  2: {
    name: 'Tracker 2',
    cat: 'cdn',
  }
};

const mockKord = new Map();
let mockDay = '2018-11-01';

export default describeModule('insights/background',
  () => ({
    ...mockDexie,
    'platform/globals': {
      chrome: {},
    },
    'platform/console': {
      default: console,
    },
    'core/http': {
      default: {},
      fetch: url => Promise.reject(new Error(`fetch rejected for ${url}`)),
    },
    'core/config': {
      default: {
        platform: 'webextension',
        settings: {
          WTM_API: '',
        }
      }
    },
    'core/prefs': {
      default: {
        set: (key, val) => {
          prefs.set(key, val);
        },
        get: (key, def) => prefs.get(key) || def,
      },
    },
    'platform/lib/tldts': tldts,
    'core/kord/inject': {
      default: {
        module: mod => ({
          action: (action) => {
            if (mockKord.has(mod) && mockKord.get(mod)[action]) {
              return mockKord.get(mod)[action];
            }
            return Promise.reject();
          },
          isPresent: () => true,
        }),
        service: () => {},
      }
    },
    'core/services/domain-info': {
      default: {
        getAppForBug(bugid) {
          return bugid - 2;
        },
        getAppOwner(appId) {
          return mockApps[appId];
        },
        getDomainOwner() {
          return mockApps[1];
        },
        getTrackerDetails(wtmOrAppId) {
          return this.getAppOwner(wtmOrAppId);
        },
      },
    },
    'platform/lib/moment': {
      default: (a) => {
        if (a) {
          return moment(a);
        }
        return moment(mockDay);
      },
    },
    'core/tabs': {
      default: {},
    }
  }), function () {
    let insights;
    const mockPageTimings = {
      timestamp: 1,
      pageTiming: {
        timing: {
          navigationStart: 1,
          loadEventEnd: 101,
        }
      },
      host: 'cliqz.com'
    };
    const mockAppList = [{
      id: 1,
      blocked: true,
      sources: [
        { url: 'https://example.com/a', blocked: true },
        { url: 'https://example.com/b', blocked: true },
        { url: 'https://example.com/c', blocked: false },
      ]
    }, {
      id: 2,
      blocked: false,
      sources: []
    }];
    const mockBugList = {
      3: {
        blocked: true,
        sources: [
          { url: 'https://example.com/a', blocked: true },
          { url: 'https://example.com/b', blocked: true },
          { url: 'https://example.com/c', blocked: false },
        ]
      },
      4: {
        blocked: false,
        sources: []
      }
    };

    beforeEach(async function () {
      prefs.clear();
      insights = this.module().default;
      await insights.init();
    });

    afterEach(async () => {
      await insights.actions.clearData();
      insights.unload();
      mockKord.clear();
    });

    it('returns empty data', async () => {
      chai.expect(await insights.actions.getDashboardStats()).to.eql({});
    });

    it('aggregates ghostery stats', async () => {
      const result = await insights.actions.pushGhosteryPageStats(4,
        mockPageTimings,
        mockAppList,
        mockBugList);

      const expectedResult = {
        loadTime: 100,
        timeSaved: 2,
        trackersDetected: 2,
        trackersBlocked: 1,
        trackerRequestsBlocked: 2,
        cookiesBlocked: 0,
        fingerprintsRemoved: 0,
        adsBlocked: 0,
        dataSaved: 0,
        trackers: new Set([1, 2]),
      };
      const expectedTrackers = new Set([1, 2]);
      chai.expect(result).to.eql({
        ...expectedResult,
        trackers: expectedTrackers,
      });
      chai.expect(await insights.actions.getDashboardStats()).to.eql({
        ...expectedResult,
        day: mockDay,
        pages: 1,
        trackers: [...expectedTrackers],
        trackersDetailed: [
          { name: 'Tracker 1', cat: 'tracker' },
          { name: 'Tracker 2', cat: 'cdn' },
        ],
      });
    });

    it('merges antitracking stats when available', async () => {
      mockKord.set('antitracking', {
        getGhosteryStats: {
          bugs: {
            3: {
              cookies: 10,
              fingerprints: 3,
              ads: 0,
            }
          },
          others: {
            trx: {
              wtm: 'trx',
              cookies: 4,
              fingerprints: 0,
              ads: 0,
            }
          },
        }
      });
      const result = await insights.actions.pushGhosteryPageStats(4,
        mockPageTimings,
        mockAppList,
        mockBugList);
      const expectedResult = {
        loadTime: 100,
        timeSaved: 2,
        trackersDetected: 3,
        trackersBlocked: 1,
        trackerRequestsBlocked: 2,
        cookiesBlocked: 14,
        fingerprintsRemoved: 3,
        adsBlocked: 0,
        dataSaved: 0,
      };
      const expectedTrackers = new Set([1, 2, 'trx']);
      chai.expect(result).to.eql({
        ...expectedResult,
        trackers: expectedTrackers,
      });
      chai.expect(await insights.actions.getDashboardStats()).to.eql({
        ...expectedResult,
        day: mockDay,
        pages: 1,
        trackers: [...expectedTrackers],
        trackersDetailed: [
          { name: 'Tracker 1', cat: 'tracker' },
          { name: 'Tracker 2', cat: 'cdn' },
          undefined, // extra tracker not in db
        ],
      });
    });

    it('merges adblocker stats when available', async () => {
      mockKord.set('adblocker', {
        getGhosteryStats: {
          bugs: {
            4: {
              cookies: 0,
              fingerprints: 0,
              ads: 4,
            }
          },
          others: {
            ads: {
              wtm: 'adsx',
              cookies: 0,
              fingerprints: 0,
              ads: 1,
            }
          },
        }
      });
      const result = await insights.actions.pushGhosteryPageStats(4,
        mockPageTimings,
        mockAppList,
        mockBugList);
      const expectedResult = {
        loadTime: 100,
        timeSaved: 8,
        trackersDetected: 2,
        trackersBlocked: 1,
        trackerRequestsBlocked: 2,
        cookiesBlocked: 0,
        fingerprintsRemoved: 0,
        adsBlocked: 5,
        dataSaved: 0,
      };
      const expectedTrackers = new Set([1, 2]);
      chai.expect(result).to.eql({
        ...expectedResult,
        trackers: expectedTrackers,
      });
      chai.expect(await insights.actions.getDashboardStats()).to.eql({
        ...expectedResult,
        day: mockDay,
        pages: 1,
        trackers: [...expectedTrackers],
        trackersDetailed: [
          { name: 'Tracker 1', cat: 'tracker' },
          { name: 'Tracker 2', cat: 'cdn' },
        ],
      });
    });

    it('aggregates page stats over time', async () => {
      await insights.actions.pushGhosteryPageStats(4,
        mockPageTimings,
        mockAppList,
        mockBugList);
      await insights.actions.pushGhosteryPageStats(4,
        mockPageTimings,
        mockAppList,
        mockBugList);
      await insights.actions.pushGhosteryPageStats(4,
        mockPageTimings,
        mockAppList,
        mockBugList);
      chai.expect(await insights.actions.getDashboardStats()).to.eql({
        day: mockDay,
        pages: 3,
        loadTime: 300,
        timeSaved: 6,
        trackersDetected: 6,
        trackersBlocked: 3,
        trackerRequestsBlocked: 6,
        cookiesBlocked: 0,
        fingerprintsRemoved: 0,
        adsBlocked: 0,
        dataSaved: 0,
        trackers: [1, 2],
        trackersDetailed: [
          { name: 'Tracker 1', cat: 'tracker' },
          { name: 'Tracker 2', cat: 'cdn' },
        ],
      });
    });

    it('aggregates page stats over multiple days', async () => {
      await insights.actions.pushGhosteryPageStats(4,
        mockPageTimings,
        mockAppList,
        mockBugList);
      await insights.actions.pushGhosteryPageStats(4,
        mockPageTimings,
        mockAppList,
        mockBugList);
      mockDay = '2018-11-02';
      await insights.actions.pushGhosteryPageStats(4,
        mockPageTimings,
        mockAppList,
        mockBugList);
      chai.expect(await insights.actions.getDashboardStats()).to.eql({
        day: mockDay,
        pages: 3,
        loadTime: 300,
        timeSaved: 6,
        trackersDetected: 6,
        trackersBlocked: 3,
        trackerRequestsBlocked: 6,
        cookiesBlocked: 0,
        fingerprintsRemoved: 0,
        adsBlocked: 0,
        dataSaved: 0,
        trackers: [1, 2],
        trackersDetailed: [
          { name: 'Tracker 1', cat: 'tracker' },
          { name: 'Tracker 2', cat: 'cdn' },
        ],
      });
      const dayStats = {
        day: mockDay,
        pages: 1,
        loadTime: 100,
        timeSaved: 2,
        trackersDetected: 2,
        trackersBlocked: 1,
        trackerRequestsBlocked: 2,
        cookiesBlocked: 0,
        fingerprintsRemoved: 0,
        adsBlocked: 0,
        dataSaved: 0,
        trackers: [1, 2],
      };
      chai.expect(await insights.actions.getDashboardStats('day')).to.eql({
        ...dayStats,
        trackersDetailed: [
          { name: 'Tracker 1', cat: 'tracker' },
          { name: 'Tracker 2', cat: 'cdn' },
        ],
      });

      chai.expect(await insights.actions.getStatsTimeline(mockDay, mockDay, true, true)).to.eql([
        dayStats,
      ]);
      chai.expect(await insights.actions.getStatsTimeline('2018-11-01', '2018-11-03', true, false)).to.eql([
        await insights.actions.getStatsForDay('2018-11-01'), dayStats,
      ]);
      chai.expect(await insights.actions.getAllDays()).to.eql(['2018-11-01', '2018-11-02']);
    });
  });
