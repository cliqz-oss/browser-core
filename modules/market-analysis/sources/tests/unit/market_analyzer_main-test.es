/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names */

let now = new Date();
function setNow(date) {
  now = date;
}

function mockNow() {
  return now;
}

export default describeModule('market-analysis/market_analyzer_main',
  () => ({
    'core/utils': {
      default: {}
    },
    'core/url': {
      getDetailsFromUrl: (url) => {
        if (url.indexOf('amazon.de') !== -1) {
          return { domain: 'amazon.de' };
        }
        if (url.indexOf('saturn.de') !== -1) {
          return { domain: 'saturn.de' };
        }
        if (url.indexOf('booking.com') !== -1) {
          return { domain: 'booking.com' };
        }
        return { domain: '' };
      }
    },
    'core/prefs': {
      default: {
        get: () => '20170602'
      }
    },
    'market-analysis/common/logger': {
      default: {
        log: () => {},
        debug: () => {},
        logObject: () => {},
        error: (msg) => { throw new Error(msg); }
      }
    },
    'market-analysis/common/now': {
      default: mockNow,
    },
    'market-analysis/conf/ma_configs': {
      default: {
        MAX_URL_LENGTH: 1000
      }
    },
    'market-analysis/data_access_provider': {
      default: class DataAccessProvider {
        saveMATable() {}
      }
    },
    'market-analysis/communication_provider': {
      default: class CommunicationProvider {}
    },
  }),
  () => {
    describe('Market Analyzer object', () => {
      let CliqzMarketAnalyzer;
      let todayTimeFrames;
      let todayDOYStr;
      let todayWOYStr;
      let todayMStr;
      let joinKeyVal;
      let MAMetrics;
      let MATimeFrames;

      beforeEach(function () {
        return this.system.import('market-analysis/model/ma_signal').then((mod) => {
          MAMetrics = mod.MAMetrics;
          MATimeFrames = mod.MATimeFrames;
        })
          .then(() => this.system.import('market-analysis/common/utils'))
          .then((mod) => {
            joinKeyVal = mod.joinKeyVal;
          })
          .then(() => {
            todayTimeFrames = { doy: 153, m: 6, woy: 22 };
            todayDOYStr = joinKeyVal(MATimeFrames.DAY_OF_YEAR, todayTimeFrames.doy);
            todayWOYStr = joinKeyVal(MATimeFrames.WEEK_OF_YEAR, todayTimeFrames.woy);
            todayMStr = joinKeyVal(MATimeFrames.MONTH, todayTimeFrames.m);

            CliqzMarketAnalyzer = this.module().default;
            CliqzMarketAnalyzer.maTable = {};
            CliqzMarketAnalyzer.regexMappings = {
              'amazon.de': {
                regexes: {
                  v: ['.'],
                  reg: ['amazon\\.de/register'],
                  sho: ['amazon\\.de/basket', 'amazon\\.de/buy'],
                  chk: ['amazon\\.de/checkout'],
                  tra: ['amazon\\.de/thankyou']
                },
                cat: 'eCommerce.Misc'
              },
              'saturn.de': {
                regexes: {
                  v: ['.'],
                  sho: ['saturn\\.de/basket', 'saturn\\.de/buy'],
                  tra: ['saturn\\.de/thankyou']
                },
                cat: 'eCommerce.Electronics'
              },
              'booking.com': {
                regexes: {
                  v: ['.'],
                  sho: ['booking\\.com/book'],
                  tra: ['booking\\.com/confirmation']
                },
                cat: 'Travel.Hotel'
              }
            };
          });
      });

      it('check _addTelemetryStats function', () => {
        CliqzMarketAnalyzer._addTelemetryStats();
        // telemetry group should be in maTable
        chai.expect(CliqzMarketAnalyzer.maTable).property('tel|any');
        // metrics should be there for today time frames
        Object.keys(MATimeFrames).forEach((tfKey) => {
          const tfStr = joinKeyVal(MATimeFrames[tfKey],
            todayTimeFrames[MATimeFrames[tfKey]]);
          chai.expect(CliqzMarketAnalyzer.maTable['tel|any']).property(tfStr);

          const expectedMetric = {};
          expectedMetric[MAMetrics.U_VISITOR] = 1;
          chai.expect(CliqzMarketAnalyzer.maTable['tel|any'][tfStr]).eql(expectedMetric);
        });
      });

      it('behaviour test for matchURL - not in DB', () => {
        CliqzMarketAnalyzer.matchURL('notindatabase.com');
        chai.expect(CliqzMarketAnalyzer.maTable).eql({});
      });

      it('behaviour test for matchURL - count first impression', () => {
        setNow(new Date());
        CliqzMarketAnalyzer.matchURL('amazon.de');
        const expected = {
          'domain|amazon.de': {
            [todayDOYStr]: { [MAMetrics.IMP]: 1, [MAMetrics.VISIT]: 1, [MAMetrics.U_VISITOR]: 1 },
            [todayWOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayMStr]: { [MAMetrics.U_VISITOR]: 1 }
          },
          'cat|eCommerce.Misc': {
            [todayDOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayWOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayMStr]: { [MAMetrics.U_VISITOR]: 1 }
          },
          'tlcat|eCommerce': {
            [todayDOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayWOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayMStr]: { [MAMetrics.U_VISITOR]: 1 }
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable).eql(expected);
      });

      it('behaviour test for matchURL - count multiple impression', () => {
        setNow(new Date());
        CliqzMarketAnalyzer.matchURL('amazon.de');
        now.setSeconds(now.getSeconds() + 2);
        CliqzMarketAnalyzer.matchURL('amazon.de');
        now.setSeconds(now.getSeconds() + 3);
        CliqzMarketAnalyzer.matchURL('amazon.de');

        const expected = {
          'domain|amazon.de': {
            [todayDOYStr]: { [MAMetrics.IMP]: 3, [MAMetrics.VISIT]: 1, [MAMetrics.U_VISITOR]: 1 },
            [todayWOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayMStr]: { [MAMetrics.U_VISITOR]: 1 }
          },
          'cat|eCommerce.Misc': {
            [todayDOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayWOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayMStr]: { [MAMetrics.U_VISITOR]: 1 }
          },
          'tlcat|eCommerce': {
            [todayDOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayWOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayMStr]: { [MAMetrics.U_VISITOR]: 1 }
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable).eql(expected);
      });

      it('behaviour test for matchURL - count multiple visits', () => {
        setNow(new Date());
        CliqzMarketAnalyzer.matchURL('amazon.de');
        now.setMinutes(now.getMinutes() + 20);
        CliqzMarketAnalyzer.matchURL('amazon.de');
        now.setMinutes(now.getMinutes() + 30);
        CliqzMarketAnalyzer.matchURL('amazon.de');

        const expected = {
          'domain|amazon.de': {
            [todayDOYStr]: { [MAMetrics.IMP]: 3, [MAMetrics.VISIT]: 2, [MAMetrics.U_VISITOR]: 1 },
            [todayWOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayMStr]: { [MAMetrics.U_VISITOR]: 1 }
          },
          'cat|eCommerce.Misc': {
            [todayDOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayWOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayMStr]: { [MAMetrics.U_VISITOR]: 1 }
          },
          'tlcat|eCommerce': {
            [todayDOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayWOYStr]: { [MAMetrics.U_VISITOR]: 1 },
            [todayMStr]: { [MAMetrics.U_VISITOR]: 1 }
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable).eql(expected);
      });

      it('behaviour test for matchURL - count multiple checkouts', () => {
        setNow(new Date());
        CliqzMarketAnalyzer.matchURL('amazon.de');
        now.setMinutes(now.getMinutes() + 2);
        CliqzMarketAnalyzer.matchURL('amazon.de/basket');
        now.setMinutes(now.getMinutes() + 3);
        CliqzMarketAnalyzer.matchURL('amazon.de/basket');
        now.setMinutes(now.getMinutes() + 5);
        CliqzMarketAnalyzer.matchURL('amazon.de/basket');

        const expected = {
          'domain|amazon.de': {
            [todayDOYStr]: {
              [MAMetrics.IMP]: 4,
              [MAMetrics.VISIT]: 1,
              [MAMetrics.SHOPPING]: 1,
              [MAMetrics.U_VISITOR]: 1,
              [MAMetrics.U_SHOPPER]: 1
            },
            [todayWOYStr]: { [MAMetrics.U_VISITOR]: 1, [MAMetrics.U_SHOPPER]: 1 },
            [todayMStr]: { [MAMetrics.U_VISITOR]: 1, [MAMetrics.U_SHOPPER]: 1 }
          },
          'cat|eCommerce.Misc': {
            [todayDOYStr]: { [MAMetrics.U_VISITOR]: 1, [MAMetrics.U_SHOPPER]: 1 },
            [todayWOYStr]: { [MAMetrics.U_VISITOR]: 1, [MAMetrics.U_SHOPPER]: 1 },
            [todayMStr]: { [MAMetrics.U_VISITOR]: 1, [MAMetrics.U_SHOPPER]: 1 }
          },
          'tlcat|eCommerce': {
            [todayDOYStr]: { [MAMetrics.U_VISITOR]: 1, [MAMetrics.U_SHOPPER]: 1 },
            [todayWOYStr]: { [MAMetrics.U_VISITOR]: 1, [MAMetrics.U_SHOPPER]: 1 },
            [todayMStr]: { [MAMetrics.U_VISITOR]: 1, [MAMetrics.U_SHOPPER]: 1 }
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable).eql(expected);
      });

      it('behaviour test for matchURL - count multiple impression with all regexes', () => {
        setNow(new Date());
        CliqzMarketAnalyzer.matchURL('amazon.de');
        CliqzMarketAnalyzer.matchURL('amazon.de');
        CliqzMarketAnalyzer.matchURL('amazon.de');
        now.setMinutes(now.getMinutes() + 2);
        CliqzMarketAnalyzer.matchURL('amazon.de/register');
        now.setMinutes(now.getMinutes() + 2);
        CliqzMarketAnalyzer.matchURL('amazon.de/basket');
        now.setMinutes(now.getMinutes() + 5);
        CliqzMarketAnalyzer.matchURL('amazon.de/basket');
        now.setMinutes(now.getMinutes() + 1);
        CliqzMarketAnalyzer.matchURL('amazon.de/checkout');
        now.setMinutes(now.getMinutes() + 1);
        CliqzMarketAnalyzer.matchURL('amazon.de/thankyou');

        let expected;
        expected = {
          [todayDOYStr]: {
            [MAMetrics.IMP]: 8,
            [MAMetrics.VISIT]: 1,
            [MAMetrics.REGISTRATION]: 1,
            [MAMetrics.SHOPPING]: 1,
            [MAMetrics.CHECKOUT]: 1,
            [MAMetrics.TRANSACTION]: 1,
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_REGISTRANT]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_POT_BUYER]: 1,
            [MAMetrics.U_BUYER]: 1,
          },
          [todayWOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_REGISTRANT]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_POT_BUYER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_REGISTRANT]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_POT_BUYER]: 1,
            [MAMetrics.U_BUYER]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['domain|amazon.de']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_REGISTRANT]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_POT_BUYER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_REGISTRANT]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_POT_BUYER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_REGISTRANT]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_POT_BUYER]: 1,
            [MAMetrics.U_BUYER]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['cat|eCommerce.Misc']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_REGISTRANT]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_POT_BUYER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_REGISTRANT]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_POT_BUYER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_REGISTRANT]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_POT_BUYER]: 1,
            [MAMetrics.U_BUYER]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['tlcat|eCommerce']).eql(expected);
      });

      it('behaviour test for matchURL - count multiple impression & domains with all regexes', () => {
        setNow(new Date());
        CliqzMarketAnalyzer.matchURL('amazon.de');
        now.setSeconds(now.getSeconds() + 5);
        CliqzMarketAnalyzer.matchURL('amazon.de');
        now.setSeconds(now.getSeconds() + 5);
        CliqzMarketAnalyzer.matchURL('amazon.de');
        now.setSeconds(now.getSeconds() + 5);
        CliqzMarketAnalyzer.matchURL('saturn.de');
        now.setMinutes(now.getMinutes() + 1);
        CliqzMarketAnalyzer.matchURL('saturn.de');
        now.setMinutes(now.getMinutes() + 1);
        CliqzMarketAnalyzer.matchURL('booking.com');
        now.setMinutes(now.getMinutes() + 1);
        CliqzMarketAnalyzer.matchURL('amazon.de/basket');
        now.setMinutes(now.getMinutes() + 5);
        CliqzMarketAnalyzer.matchURL('amazon.de/basket');
        now.setMinutes(now.getMinutes() + 1);
        CliqzMarketAnalyzer.matchURL('amazon.de/thankyou');

        now.setMinutes(now.getMinutes() + 1);
        CliqzMarketAnalyzer.matchURL('saturn.de/basket');

        now.setMinutes(now.getMinutes() + 1);
        CliqzMarketAnalyzer.matchURL('booking.com/book');
        now.setMinutes(now.getMinutes() + 1);
        CliqzMarketAnalyzer.matchURL('booking.com/confirmation');

        chai.expect(Object.keys(CliqzMarketAnalyzer.maTable).length).eql(8);

        let expected;
        expected = {
          [todayDOYStr]: {
            [MAMetrics.IMP]: 6,
            [MAMetrics.VISIT]: 1,
            [MAMetrics.SHOPPING]: 1,
            [MAMetrics.TRANSACTION]: 1,
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1,

          },
          [todayWOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['domain|amazon.de']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.IMP]: 3,
            [MAMetrics.VISIT]: 1,
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.SHOPPING]: 1,
            [MAMetrics.U_SHOPPER]: 1,
          },
          [todayWOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
          },
          [todayMStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['domain|saturn.de']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.IMP]: 3,
            [MAMetrics.VISIT]: 1,
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.SHOPPING]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.TRANSACTION]: 1,
            [MAMetrics.U_BUYER]: 1,
          },
          [todayWOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['domain|booking.com']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['cat|eCommerce.Misc']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['cat|eCommerce.Electronics']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['cat|Travel.Hotel']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['tlcat|eCommerce']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_VISITOR]: 1,
            [MAMetrics.U_SHOPPER]: 1,
            [MAMetrics.U_BUYER]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['tlcat|Travel']).eql(expected);
      });
    });
  });
