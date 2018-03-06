/* global chai */
/* global describeModule */
/* global require */


export default describeModule('offers-v2/features/geo_checker',
  () => ({
    'platform/console': {
      default: {}
    },
    'platform/gzip': {
      default: {}
    },
    'platform/globals': {
      default: {}
    },
    'core/cliqz': {
      default: {},
      utils: {
        setInterval: function() {},
      }
    },
    'core/helpers/timeout': {
      default: function() { const stop = () => {}; return { stop }; }
    },
    'core/prefs': {
      default: {
        get(x,y) { return y; }
      }
    },
    'platform/xmlhttprequest': {
      default: {}
    },
    'platform/fetch': {
      default: {}
    },
  }),
  () => {
    describe('general tests', function() {
      let GeoChecker;
      beforeEach(function () {
        GeoChecker = this.module().default;
      });

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

            gc.updateLocation({coordss: {}, locss: {}});
            chai.expect(gc.isAvailable()).eql(false);
            // chai.expect(gc.isCoordsAvailable()).eql(false);
            chai.expect(gc.isLocAvailable()).eql(false);

            gc.updateLocation({ coords: {long: 1, lat: 2} });
            chai.expect(gc.isAvailable()).eql(false);
            // chai.expect(gc.isCoordsAvailable()).eql(true);
            chai.expect(gc.isLocAvailable()).eql(false);

            gc.updateLocation({ loc: {country: 'de', city: 'munich'} });
            chai.expect(gc.isAvailable()).eql(true);
            // chai.expect(gc.isCoordsAvailable()).eql(false);
            chai.expect(gc.isLocAvailable()).eql(true);
          });
        });

        context('/isSameLocation workds', function () {
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
              {countr: 'de', city: 'whatever'},
              {country: 'de', city: 'whatever2'},
              {country: 'de', city: 'munich', zip: '3333'},
              {country: 'fr', city: 'munich', zip: '1234'},
              {country: 'de', city: 'munichh', zip: '1234'},
            ];
            toCheck.forEach((d) => {
              chai.expect(gc.isSameLocation(d)).eql(false);
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
              {country: 'de'},
              {country: 'de', city: 'munich'},
              {country: 'de', city: 'munich', zip: '1234'},
            ];
            toCheck.forEach((d) => {
              chai.expect(gc.isSameLocation(d)).eql(true);
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
              {country: 'de'},
              {country: 'de', city: 'munich'},
              {country: 'de', city: 'munich', zip: '1234'},
            ];
            toCheck.forEach((d) => {
              chai.expect(gc.isSameLocation(d)).eql(false);
            });

            // update loc
            d.loc.country = 'de';
            d.loc.city = 'munich';
            gc.updateLocation(d);
            chai.expect(gc.isAvailable()).eql(true);
            chai.expect(gc.isLocAvailable()).eql(true);
            toCheck.forEach((d) => {
              chai.expect(gc.isSameLocation(d)).eql(true);
            });
          });
        });

      });
    })
  }
);
