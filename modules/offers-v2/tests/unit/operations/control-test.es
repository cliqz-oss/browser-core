/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */

export default describeModule('offers-v2/operations/control',
  () => ({
  }),
  () => {
    describe('/control operations', () => {
      let ops;
      let eventLoop;
      let resultHookedFunc;

      function mockEventLoop(obj) {
        eventLoop = obj;
      }

      function hookedFunc(...args) {
        resultHookedFunc = args;
      }

      beforeEach(function () {
        ops = this.module().default;
      });

      /**
       * ==================================================
       * $if_pref operation tests
       * ==================================================
       */
      describe('/if_pref', () => {
        let op;
        beforeEach(function () {
          op = ops.$if_pref;
          mockEventLoop({
            environment: {
              getPref: (prefName, defaultVal) => {
                if (prefName !== 'existingPref') {
                  return defaultVal;
                }
                return true;
              }
            }
          });
        });

        it('/invalid args call', () => {
          return Promise.all([
            // missing expected value
            op.call(this, ['existingPref'], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),
          ]);
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this, ['existingPref', 'true'], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),

            op.call(this, ['neverExistPref', 'abc'], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),

            op.call(this, ['neverExistPref', 'undefined'], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),

            op.call(this, ['neverExistPref', undefined], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            )
          ]);
        });
      });

      /**
       * ==================================================
       * log operation tests
       * ==================================================
       */
      describe('/log', () => {
        let op;
        beforeEach(function () {
          op = ops.$log;
          mockEventLoop({
            environment: {
              info: (key, message) => hookedFunc(key, message)
            }
          });
        });

        it('/invalid args call', () => {
          return Promise.all([
            // empty args
            op.call(this, [], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),
          ]);
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this, ['signals sent'], eventLoop).then(
              (result) => {
                chai.expect(result).eql(undefined);
                chai.expect(resultHookedFunc.length).eql(2);
                chai.expect(resultHookedFunc[0]).eql('Trigger');
                chai.expect(resultHookedFunc[1]).eql('signals sent');
              },
              (error) => {
                chai.assert.fail(error, undefined, error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * and operation tests
       * ==================================================
       */
      describe('/and', () => {
        let op;
        beforeEach(function () {
          op = ops.$and;
        });

        it('/invalid args call', () => {
          return Promise.all([
            op.call(this, true, eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),

            op.call(this, [], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),

            op.call(this, [1], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),
          ]);
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this, [true, true], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),

            op.call(this, [true, false], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),

            op.call(this, [false, true], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),

            op.call(this, [false, false], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),

            op.call(this, [true, true, false, true], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * or operation tests
       * ==================================================
       */
      describe('/or', () => {
        let op;
        beforeEach(function () {
          op = ops.$or;
        });

        it('/invalid args call', () => {
          return Promise.all([
            op.call(this, true, eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),

            op.call(this, [], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),

            op.call(this, [1], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),
          ]);
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this, [true, true], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),

            op.call(this, [true, false], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),

            op.call(this, [false, true], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),

            op.call(this, [false, false], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),

            op.call(this, [true, true, false, true], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * not operation tests
       * ==================================================
       */
      describe('/not', () => {
        let op;
        beforeEach(function () {
          op = ops.$not;
        });

        it('/invalid args call', () => {
          return Promise.all([
            op.call(this, [], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),
          ]);
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this, [true], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),

            op.call(this, [false], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * eq operation tests
       * ==================================================
       */
      describe('/eq', () => {
        let op;
        beforeEach(function () {
          op = ops.$eq;
        });

        it('/invalid args call', () => {
          return Promise.all([
            op.call(this, [], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),
          ]);
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this, [true, true], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),

            op.call(this, [true, false], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),

            op.call(this, [1, 2], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),

            op.call(this, [2, 2], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * gt operation tests
       * ==================================================
       */
      describe('/gt', () => {
        let op;
        beforeEach(function () {
          op = ops.$gt;
        });

        it('/invalid args call', () => {
          return Promise.all([
            op.call(this, [], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),

            op.call(this, [1], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),
          ]);
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this, [true, true], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),

            op.call(this, [1, 2], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),

            op.call(this, [2, 1], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * lt operation tests
       * ==================================================
       */
      describe('/lt', () => {
        let op;
        beforeEach(function () {
          op = ops.$lt;
        });

        it('/invalid args call', () => {
          return Promise.all([
            op.call(this, [], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),
          ]);
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this, [true, true], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),

            op.call(this, [1, 2], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),

            op.call(this, [2, 1], eventLoop).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * match operation tests
       * ==================================================
       */
      describe('/match', () => {
        let op;
        beforeEach(function () {
          op = ops.$match;
          mockEventLoop({
            regexpCache: {
              getRegexp: pattern => new RegExp(pattern)
            }
          });
        });

        it('/invalid args call', () => {
          return Promise.all([
            op.call(this, true, eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),

            op.call(this, [], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),

            op.call(this, [1], eventLoop).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),
          ]);
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this, ['https://amazon.de/basket', 'amazon.de/basket'], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),

            op.call(this, ['https://amazon.de/basket', 'ebay.de', 'amazon.de/basket'], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),

            op.call(this, ['https://amazon.de/basket', '.'], eventLoop).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * match_url operation tests
       * ==================================================
       */
      describe('/match_url', () => {
        let op;
        beforeEach(function () {
          op = ops.$match_url;
          mockEventLoop({
            regexpCache: {
              getRegexp: pattern => new RegExp(pattern)
            },
            historyIndex: {
              addUrl: (url, context) => hookedFunc(url, context)
            }
          });
        });

        it('/invalid args call', () => {
          const context = {};
          return Promise.all([
            op.call(this, [], eventLoop, context).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),

            op.call(this, ['https://amazon.de'], eventLoop, context).then(
              (result) => {
                chai.assert.fail(result, 'error', result);
              },
              (error) => {
                chai.expect(error).an('error');
              }
            ),
          ]);
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this, ['ebay.de', 'amazon.de/basket'],
              eventLoop,
              { '#url': 'https://amazon.de/basket' }).then(
              (result) => {
                chai.expect(result).eql(true);
              },
              (error) => {
                chai.assert.fail(error, true, error);
              }
            ),

            op.call(this, ['ebay.de', 'amazon.de/basket2'],
              eventLoop,
              { '#url': 'https://amazon.de/basket' }).then(
              (result) => {
                chai.expect(result).eql(false);
              },
              (error) => {
                chai.assert.fail(error, false, error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * timestamp operation tests
       * ==================================================
       */
      describe('/timestamp', () => {
        let op;
        beforeEach(function () {
          op = ops.$timestamp;
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this).then(
              (result) => {
                chai.expect(new Date(result).year).eql(new Date().year);
                chai.expect(new Date(result).month).eql(new Date().month);
                chai.expect(new Date(result).day).eql(new Date().day);
              },
              (error) => {
                chai.assert.fail(error, '', error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * day_hour operation tests
       * ==================================================
       */
      describe('/day_hour', () => {
        let op;
        beforeEach(function () {
          op = ops.$day_hour;
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this).then(
              (result) => {
                chai.expect(result).eql(new Date().getHours());
              },
              (error) => {
                chai.assert.fail(error, '', error);
              }
            ),
          ]);
        });
      });

      /**
       * ==================================================
       * week_day operation tests
       * ==================================================
       */
      describe('/week_day', () => {
        let op;
        beforeEach(function () {
          op = ops.$week_day;
        });

        it('/simple checks', () => {
          return Promise.all([
            op.call(this).then(
              (result) => {
                chai.expect(result).eql(new Date().getDay() + 1);
              },
              (error) => {
                chai.assert.fail(error, '', error);
              }
            ),
          ]);
        });
      });
    });
  },
);
