/* global chai, describeModule */
const Rx = require('rxjs');
const operators = require('rxjs/operators');
const tldts = require('tldts');
const mockDexie = require('../../core/unit/utils/dexie');

function mockIsTrackerDomain(d) {
  return d === 'tracker.com';
}

const ONE_HOUR = 60 * 60;
const ONE_WEEK = ONE_HOUR * 24 * 7;
const cookieMock = {
  cookiesSet: [],
  cookiesDeleted: [],
  set(cki) {
    this.cookiesSet.push(cki);
  },
  remove(cki) {
    this.cookiesDeleted.push(cki);
  },
  reset() {
    this.cookiesSet = [];
    this.cookiesDeleted = [];
  }
};

const mockTrackerCookie = {
  removed: false,
  cookie: {
    name: 'cto_lwid',
    value: '5b23595a-24db-4424-ba6a-f53f83fd63e7',
    domain: '.tracker.com',
    hostOnly: false,
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'no_restriction',
    session: false,
    firstPartyDomain: '',
    expirationDate: Date.now(),
    storeId: 'firefox-default'
  },
  cause: 'explicit'
};

function mockCookieChange(domain, name, expirationDate, value = 'random', httpOnly = false, session = false) {
  return {
    removed: false,
    cookie: {
      name,
      value,
      domain,
      hostOnly: false,
      path: '/',
      secure: false,
      httpOnly,
      sameSite: 'no_restriction',
      session,
      firstPartyDomain: '',
      expirationDate,
      storeId: 'firefox-default'
    },
    cause: 'explicit',
  };
}

function nowSeconds() {
  return Date.now() / 1000;
}

export default describeModule('cookie-monster/cookie-monster',
  () => ({
    ...mockDexie,
    rxjs: Rx,
    'rxjs/operators': operators,
    'platform/lib/tldts': tldts,
    'platform/cookies': {
      default: cookieMock,
    },
  }), function () {
    let CookieMonster;
    let cm;

    beforeEach(function () {
      cookieMock.reset();
      CookieMonster = this.module().default;
    });

    afterEach(async () => {
      cm.unload();
      await cm.db.delete();
    });

    function trackerCookieTests() {
      context('#processBatch', () => {
        it('updates tracker cookie expiry', async () => {
          mockTrackerCookie.cookie.expirationDate = nowSeconds() + 10000000;
          chai.expect(await cm.processBatch([mockTrackerCookie])).to.eql(['update']);
          chai.expect(cookieMock.cookiesDeleted).to.eql([]);
          chai.expect(cookieMock.cookiesSet).to.have.length(1);
          const cookie = cookieMock.cookiesSet[0];
          chai.expect(cookie.url).to.eql('http://tracker.com/');
          chai.expect(cookie.expirationDate).to.be.lessThan(Date.now() / 1000 + 3600);
        });

        it('expiration sticks on subsequent set', async () => {
          mockTrackerCookie.cookie.expirationDate = nowSeconds() + 10000000;
          const cookieInfo = mockTrackerCookie;
          // first batch
          chai.expect(await cm.processBatch([cookieInfo])).to.eql(['update']);
          chai.expect(cookieMock.cookiesSet).to.have.length(1);
          const cookie = cookieMock.cookiesSet[0];
          chai.expect(cookie.url).to.eql('http://tracker.com/');
          chai.expect(cookie.expirationDate).to.be.lessThan(nowSeconds() + ONE_HOUR);

          // second batch
          cookieMock.reset();
          chai.expect(await cm.processBatch([cookieInfo])).to.eql(['update']);
          chai.expect(cookieMock.cookiesSet).to.have.length(1);
          chai.expect(cookieMock.cookiesSet[0].expirationDate).to.eql(cookie.expirationDate);
        });
      });

      context('#addVisit', () => {
        it('sets longer expiry if domain visited', async () => {
          mockTrackerCookie.cookie.expirationDate = nowSeconds() + 10000000;
          await cm.addVisit('tracker.com');
          chai.expect(await cm.processBatch([mockTrackerCookie])).to.eql(['update']);
          chai.expect(cookieMock.cookiesDeleted).to.eql([]);
          chai.expect(cookieMock.cookiesSet).to.have.length(1);
          const cookie = cookieMock.cookiesSet[0];
          chai.expect(cookie.url).to.eql('http://tracker.com/');
          chai.expect(cookie.expirationDate).to.be.greaterThan(nowSeconds() + ONE_HOUR);
          chai.expect(cookie.expirationDate).to.be.lessThan(nowSeconds() + ONE_WEEK);
        });

        it('sets 30 day expiry if domain was visited more than 7 times', async () => {
          mockTrackerCookie.cookie.expirationDate = nowSeconds() + 100000000;
          const d = new Date();
          await cm.addVisit('tracker.com', d);
          d.setDate(d.getDate() - 1);
          await cm.addVisit('tracker.com', d);
          d.setDate(d.getDate() - 1);
          await cm.addVisit('tracker.com', d);
          d.setDate(d.getDate() - 1);
          await cm.addVisit('tracker.com', d);
          d.setDate(d.getDate() - 1);
          await cm.addVisit('tracker.com', d);
          d.setDate(d.getDate() - 1);
          await cm.addVisit('tracker.com', d);
          d.setDate(d.getDate() - 1);
          await cm.addVisit('tracker.com', d);

          chai.expect(await cm.getTrackerCookieVisits([mockTrackerCookie])).to.eql({
            'tracker.com': {
              visits: 7,
            }
          });
          chai.expect(await cm.processBatch([mockTrackerCookie])).to.eql(['update']);
          chai.expect(cookieMock.cookiesDeleted).to.eql([]);
          chai.expect(cookieMock.cookiesSet).to.have.length(1);
          const cookie = cookieMock.cookiesSet[0];
          chai.expect(cookie.url).to.eql('http://tracker.com/');
          chai.expect(cookie.expirationDate).to.be.greaterThan(nowSeconds() + ONE_HOUR);
          chai.expect(cookie.expirationDate, 'more than a week').to.be.greaterThan(nowSeconds() + ONE_WEEK);
          chai.expect(cookie.expirationDate, 'less than 5 weeks').to.be.lessThan(nowSeconds() + (ONE_WEEK * 5));
        });
      });
    }

    context('default config', () => {
      beforeEach(async () => {
        cm = new CookieMonster(mockIsTrackerDomain, {});
        await cm.init();
      });

      context('#shouldObserve', () => {
        it('observes tracker cookies', () => {
          chai.expect(cm.shouldObserve({
            domain: 'tracker.com',
          })).to.be.true;
        });

        it('observes tracker cookies with leading .', () => {
          chai.expect(cm.shouldObserve({
            domain: '.tracker.com',
          })).to.be.true;
        });

        it('does not observe non-tracker cookies', () => {
          chai.expect(cm.shouldObserve({
            domain: 'example.com',
          })).to.be.false;
        });
      });

      trackerCookieTests();
    });

    context('session and non-tracker cookies', () => {
      beforeEach(async () => {
        cm = new CookieMonster(mockIsTrackerDomain, {
          expireSession: true,
          nonTracker: true,
        });
        await cm.init();
      });

      context('#shouldObserve', () => {
        it('observes tracker cookies', () => {
          chai.expect(cm.shouldObserve({
            domain: 'tracker.com',
          })).to.be.true;
        });

        it('observes tracker cookies with leading .', () => {
          chai.expect(cm.shouldObserve({
            domain: '.tracker.com',
          })).to.be.true;
        });

        it('observes non-tracker cookies', () => {
          chai.expect(cm.shouldObserve({
            domain: 'example.com',
          })).to.be.true;
        });
      });

      trackerCookieTests();

      context('non tracker cookies', () => {
        it('30 days for httpOnly, 7 days otherwise', async () => {
          chai.expect(await cm.processBatch([
            mockCookieChange('example.com', 'test', nowSeconds() + 10000000, 'test', false),
            mockCookieChange('example.com', 'httptest', nowSeconds() + 10000000, 'test', true),
          ])).to.eql(['update', 'update']);
          chai.expect(cookieMock.cookiesDeleted).to.eql([]);
          chai.expect(cookieMock.cookiesSet).to.have.length(2);
          // non-httpOnly cookie: one week expiry
          chai.expect(cookieMock.cookiesSet[0].url).to.eql('http://example.com/');
          chai.expect(cookieMock.cookiesSet[0].httpOnly).to.be.false;
          chai.expect(cookieMock.cookiesSet[0].expirationDate).to.be.lessThan(
            nowSeconds() + ONE_WEEK
          );
          chai.expect(cookieMock.cookiesSet[0].expirationDate).to.be.greaterThan(
            nowSeconds() + ONE_HOUR * 24
          );
          // httpOnly cookie: 30 days expiry
          chai.expect(cookieMock.cookiesSet[1].url).to.eql('http://example.com/');
          chai.expect(cookieMock.cookiesSet[1].httpOnly).to.be.true;
          chai.expect(cookieMock.cookiesSet[1].expirationDate).to.be.lessThan(
            nowSeconds() + ONE_WEEK * 5
          );
          chai.expect(cookieMock.cookiesSet[1].expirationDate).to.be.greaterThan(
            nowSeconds() + ONE_WEEK * 3
          );
        });

        it('special case cookies', async () => {
          chai.expect(await cm.processBatch([
            mockCookieChange('example.com', '_ga', nowSeconds() + 10000000),
            mockCookieChange('example.com', '_gid', nowSeconds() + 10000000),
          ])).to.eql(['update', 'update']);
          chai.expect(cookieMock.cookiesSet).to.have.length(2);

          chai.expect(cookieMock.cookiesSet[0].url).to.eql('http://example.com/');
          chai.expect(cookieMock.cookiesSet[0].expirationDate).to.be.lessThan(
            nowSeconds() + ONE_WEEK
          );
          chai.expect(cookieMock.cookiesSet[0].expirationDate).to.be.greaterThan(
            nowSeconds() + ONE_HOUR * 24
          );

          chai.expect(cookieMock.cookiesSet[1].expirationDate).to.be.lessThan(
            nowSeconds() + ONE_HOUR * 2
          );
        });
      });
    });
  });
