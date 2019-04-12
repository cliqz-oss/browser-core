/* global chai */
/* global describeModule */
/* global require */
const prefsMock = require('./utils/prefs');

export default describeModule('offers-v2/features/geo_checker',
  () => ({
    ...prefsMock,
    'platform/gzip': {
      default: {}
    },
    'core/http': {
      default: {}
    },
    'platform/xmlhttprequest': {
      default: {}
    },
    'platform/fetch': {
      default: {}
    },
  }),
  () => {
    describe('general tests', function () {
      let GeoChecker;
      beforeEach(function () {
        GeoChecker = this.module().default;
      });

      function buildMapFormObj(obj) {
        if (!obj) { return null; }
        const m = new Map();
        Object.keys(obj).forEach((k1) => {
          m.set(k1, new Map());
          Object.keys(obj[k1]).forEach((k2) => {
            const topObj = obj[k1];
            m.get(k1).set(k2, new Set(topObj[k2]));
          });
        });

        return m;
      }

      describe('#loc tests', function () {
        context('validity checks', function () {
          let gc;
          beforeEach(function () {
            gc = new GeoChecker();
          });

          it('disabled by default check', function () {
            chai.expect(gc.isAvailable()).eql(false);
            // chai.expect(gc.isCoordsAvailable()).eql(false);
            chai.expect(gc.isLocAvailable()).eql(false);
          });

          it('updateLocation works', function () {
            gc.updateLocation(null);
            chai.expect(gc.isAvailable()).eql(false);
            // chai.expect(gc.isCoordsAvailable()).eql(false);
            chai.expect(gc.isLocAvailable()).eql(false);

            gc.updateLocation({});
            chai.expect(gc.isAvailable()).eql(false);
            // chai.expect(gc.isCoordsAvailable()).eql(false);
            chai.expect(gc.isLocAvailable()).eql(false);

            gc.updateLocation({ coordss: {}, locss: {} });
            chai.expect(gc.isAvailable()).eql(false);
            // chai.expect(gc.isCoordsAvailable()).eql(false);
            chai.expect(gc.isLocAvailable()).eql(false);

            gc.updateLocation({ coords: { long: 1, lat: 2 } });
            chai.expect(gc.isAvailable()).eql(false);
            // chai.expect(gc.isCoordsAvailable()).eql(true);
            chai.expect(gc.isLocAvailable()).eql(false);

            gc.updateLocation({ loc: { country: 'de', city: 'munich' } });
            chai.expect(gc.isAvailable()).eql(true);
            // chai.expect(gc.isCoordsAvailable()).eql(false);
            chai.expect(gc.isLocAvailable()).eql(true);
          });
        });

        context('/isSameLocation works', function () {
          let gc;
          beforeEach(function () {
            gc = new GeoChecker();
          });

          it('simple false checks works', function () {
            const d = {
              loc: {
                country: 'de',
                city: 'munich',
                zip: '1234'
              }
            };
            gc.updateLocation(d);
            chai.expect(gc.isAvailable()).eql(true);
            chai.expect(gc.isLocAvailable()).eql(true);
            const toCheck = [
              {},
              { countr: 'de', city: 'whatever' },
              { country: 'de', city: 'whatever2' },
              { country: 'de', city: 'munich', zip: '3333' },
              { country: 'fr', city: 'munich', zip: '1234' },
              { country: 'de', city: 'munichh', zip: '1234' },
            ];
            toCheck.forEach((_d) => {
              chai.expect(gc.isSameLocation(_d)).eql(false);
            });
          });

          it('simple positive checks works', function () {
            const d = {
              loc: {
                country: 'de',
                city: 'munich',
                zip: '1234'
              }
            };
            gc.updateLocation(d);
            chai.expect(gc.isAvailable()).eql(true);
            chai.expect(gc.isLocAvailable()).eql(true);
            const toCheck = [
              { country: 'de' },
              { country: 'de', city: 'munich' },
              { country: 'de', city: 'munich', zip: '1234' },
            ];
            toCheck.forEach((_d) => {
              chai.expect(gc.isSameLocation(_d)).eql(true);
            });
          });

          it('checks pass after updating loc', function () {
            const d = {
              loc: {
                country: 'fr',
                city: 'paris',
                zip: '1234'
              }
            };
            gc.updateLocation(d);
            chai.expect(gc.isAvailable()).eql(true);
            chai.expect(gc.isLocAvailable()).eql(true);
            const toCheck = [
              { country: 'de' },
              { country: 'de', city: 'munich' },
              { country: 'de', city: 'munich', zip: '1234' },
            ];
            toCheck.forEach((_d) => {
              chai.expect(gc.isSameLocation(_d)).eql(false);
            });

            // update loc
            d.loc.country = 'de';
            d.loc.city = 'munich';
            gc.updateLocation(d);
            chai.expect(gc.isAvailable()).eql(true);
            chai.expect(gc.isLocAvailable()).eql(true);
            toCheck.forEach((_d) => {
              chai.expect(gc.isSameLocation(_d)).eql(true);
            });
          });

          it('checks matches works for country city and postal', function () {
            const d = {
              loc: {
                country: 'fr',
                city: 'paris',
                zip: '1234'
              }
            };
            gc.updateLocation(d);
            chai.expect(gc.isAvailable()).eql(true);
            chai.expect(gc.isLocAvailable()).eql(true);

            // we want to check:
            const toCheck = [
              { de: {} },
              { de: { munich: [] } },
              { de: { munich: ['1234'] } },
            ];
            toCheck.forEach((obj) => {
              chai.expect(gc.matches(buildMapFormObj(obj))).eql(false);
            });

            // update loc
            d.loc.country = 'de';
            d.loc.city = 'munich';
            gc.updateLocation(d);
            chai.expect(gc.isAvailable()).eql(true);
            chai.expect(gc.isLocAvailable()).eql(true);
            toCheck.forEach((obj) => {
              chai.expect(gc.matches(buildMapFormObj(obj)), `failed: ${JSON.stringify(obj)}`).eql(true);
            });
          });

          it('checks matches doesnt match if missing data', function () {
            const d = {
              loc: {
                country: 'de',
                city: 'munich',
              }
            };
            gc.updateLocation(d);
            chai.expect(gc.matches(buildMapFormObj({ de: {} }))).eql(true);
            chai.expect(gc.matches(buildMapFormObj({ de: { munich: [] } }))).eql(true);
            chai.expect(gc.matches(buildMapFormObj({ de: { munich: ['1234'] } }))).eql(false);

            // remove city and check
            delete d.loc.city;
            gc.updateLocation(d);
            chai.expect(gc.matches(buildMapFormObj({ de: {} }))).eql(true);
            chai.expect(gc.matches(buildMapFormObj({ de: { munich: [] } }))).eql(false);
            chai.expect(gc.matches(buildMapFormObj({ de: { munich: ['1234'] } }))).eql(false);
          });
        });
      });
    });
  });
