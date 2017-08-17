/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names */
import { MAMetrics, MATimeFrames } from 'market-analysis/model/ma_signal';
import { joinKeyVal } from 'market-analysis/common/utils';

export default describeModule('market-analysis/market_analyzer_main',
  () => ({
    'core/cliqz': {
      utils: {
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
      }
    },
    'core/prefs': {
      default: {
        get: () => '20170602'
      }
    },
    'market-analysis/common/logger': {
      default: {
        debug: () => {},
        logObject: () => {}
      }
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
      const todayTimeFrames = { doy: 153, m: 6, woy: 22 };
      const todayDOYStr = joinKeyVal(MATimeFrames.DAY_OF_YEAR,
        todayTimeFrames.doy);
      const todayWOYStr = joinKeyVal(MATimeFrames.WEEK_OF_YEAR,
        todayTimeFrames.woy);
      const todayMStr = joinKeyVal(MATimeFrames.MONTH,
        todayTimeFrames.m);

      beforeEach(function () {
        CliqzMarketAnalyzer = this.module().default;
        CliqzMarketAnalyzer.maTable = {};
        CliqzMarketAnalyzer.regexMappings = {
          'amazon.de': {
            regexes: {
              cr1: ['amazon\\.de/basket', 'amazon\\.de/buy'],
              cr2: ['amazon\\.de/thankyou'],
              v: ['.']
            },
            cat: 'eCommerce.Misc'
          },
          'saturn.de': {
            regexes: {
              cr1: ['saturn\\.de/basket', 'saturn\\.de/buy'],
              cr2: ['saturn\\.de/thankyou'],
              v: ['.']
            },
            cat: 'eCommerce.Electronics'
          },
          'booking.com': {
            regexes: {
              cr1: ['booking\\.com/book'],
              cr2: ['booking\\.com/confirmation'],
              v: ['.']
            },
            cat: 'Travel.Hotel'
          }
        };
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
          expectedMetric[MAMetrics.U_IMP] = 1;
          chai.expect(CliqzMarketAnalyzer.maTable['tel|any'][tfStr]).eql(expectedMetric);
        });
      });

      it('behaviour test for matchURL - not in DB', () => {
        CliqzMarketAnalyzer.matchURL('notindatabase.com');
        chai.expect(CliqzMarketAnalyzer.maTable).eql({});
      });

      it('behaviour test for matchURL - count first impression', () => {
        CliqzMarketAnalyzer.matchURL('amazon.de');
        const expected = {
          'domain|amazon.de': {
            [todayDOYStr]: { [MAMetrics.IMP]: 1, [MAMetrics.U_IMP]: 1 },
            [todayWOYStr]: { [MAMetrics.U_IMP]: 1 },
            [todayMStr]: { [MAMetrics.U_IMP]: 1 }
          },
          'cat|eCommerce.Misc': {
            [todayDOYStr]: { [MAMetrics.U_IMP]: 1 },
            [todayWOYStr]: { [MAMetrics.U_IMP]: 1 },
            [todayMStr]: { [MAMetrics.U_IMP]: 1 }
          },
          'tlcat|eCommerce': {
            [todayDOYStr]: { [MAMetrics.U_IMP]: 1 },
            [todayWOYStr]: { [MAMetrics.U_IMP]: 1 },
            [todayMStr]: { [MAMetrics.U_IMP]: 1 }
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable).eql(expected);
      });

      it('behaviour test for matchURL - count multiple impression', () => {
        CliqzMarketAnalyzer.matchURL('amazon.de');
        CliqzMarketAnalyzer.matchURL('amazon.de');
        CliqzMarketAnalyzer.matchURL('amazon.de');

        const expected = {
          'domain|amazon.de': {
            [todayDOYStr]: { [MAMetrics.IMP]: 3, [MAMetrics.U_IMP]: 1 },
            [todayWOYStr]: { [MAMetrics.U_IMP]: 1 },
            [todayMStr]: { [MAMetrics.U_IMP]: 1 }
          },
          'cat|eCommerce.Misc': {
            [todayDOYStr]: { [MAMetrics.U_IMP]: 1 },
            [todayWOYStr]: { [MAMetrics.U_IMP]: 1 },
            [todayMStr]: { [MAMetrics.U_IMP]: 1 }
          },
          'tlcat|eCommerce': {
            [todayDOYStr]: { [MAMetrics.U_IMP]: 1 },
            [todayWOYStr]: { [MAMetrics.U_IMP]: 1 },
            [todayMStr]: { [MAMetrics.U_IMP]: 1 }
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable).eql(expected);
      });

      it('behaviour test for matchURL - count multiple impression with all regexes', () => {
        CliqzMarketAnalyzer.matchURL('amazon.de');
        CliqzMarketAnalyzer.matchURL('amazon.de');
        CliqzMarketAnalyzer.matchURL('amazon.de');
        CliqzMarketAnalyzer.matchURL('amazon.de/basket');
        CliqzMarketAnalyzer.matchURL('amazon.de/basket');
        CliqzMarketAnalyzer.matchURL('amazon.de/thankyou');

        let expected;
        expected = {
          [todayDOYStr]: {
            [MAMetrics.IMP]: 6,
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_IMP]: 2,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1,
          },
          [todayWOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['domain|amazon.de']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['cat|eCommerce.Misc']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['tlcat|eCommerce']).eql(expected);
      });

      it('behaviour test for matchURL - count multiple impression & domains with all regexes', () => {
        CliqzMarketAnalyzer.matchURL('amazon.de');
        CliqzMarketAnalyzer.matchURL('amazon.de');
        CliqzMarketAnalyzer.matchURL('amazon.de');
        CliqzMarketAnalyzer.matchURL('saturn.de');
        CliqzMarketAnalyzer.matchURL('saturn.de');
        CliqzMarketAnalyzer.matchURL('booking.com');

        CliqzMarketAnalyzer.matchURL('amazon.de/basket');
        CliqzMarketAnalyzer.matchURL('amazon.de/basket');
        CliqzMarketAnalyzer.matchURL('amazon.de/thankyou');

        CliqzMarketAnalyzer.matchURL('saturn.de/basket');

        CliqzMarketAnalyzer.matchURL('booking.com/book');
        CliqzMarketAnalyzer.matchURL('booking.com/confirmation');

        chai.expect(Object.keys(CliqzMarketAnalyzer.maTable).length).eql(8);

        let expected;
        expected = {
          [todayDOYStr]: {
            [MAMetrics.IMP]: 6,
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_IMP]: 2,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1,
          },
          [todayWOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['domain|amazon.de']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.IMP]: 3,
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
          },
          [todayWOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
          },
          [todayMStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['domain|saturn.de']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.IMP]: 3,
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1,
          },
          [todayWOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['domain|booking.com']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['cat|eCommerce.Misc']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['cat|eCommerce.Electronics']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['cat|Travel.Hotel']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['tlcat|eCommerce']).eql(expected);

        expected = {
          [todayDOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayWOYStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          },
          [todayMStr]: {
            [MAMetrics.U_IMP]: 1,
            [MAMetrics.CR1_U_IMP]: 1,
            [MAMetrics.CR2_U_IMP]: 1
          }
        };
        chai.expect(CliqzMarketAnalyzer.maTable['tlcat|Travel']).eql(expected);
      });
    });
  },
);
