/* global chai */
/* global describeModule */
/* global require */
/* global sinon */

const moment = require('moment');
const MockDate = require('mockdate');
const commonMocks = require('./utils/common');
const persistenceMocks = require('./utils/persistence');
const waitFor = require('./utils/waitfor');

export default describeModule('offers-v2/trigger_machine/trigger_machine',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
    'platform/xmlhttprequest': {
      default: {}
    },
    'core/http': {
      default: {}
    },
    'platform/fetch': {
      default: {}
    },
    'platform/gzip': {
      default: {}
    },
    'platform/environment': {
      default: {}
    },
  }),
  () => {
    describe('trigger_machine', function () {
      // here we will define all the modules we need / depend on for the
      // construction of the event loop and different objects,
      // we may need to refactor the code to make this clear later
      // some of the modules will be mocked some others not
      let TriggerMachine;
      let CategoryHandler;
      let IntentHandler;
      let ThrottleError;
      let Category;
      let exprBuilder;
      let Expression;
      let exprMockCallbacks;
      let MockExpression;
      let globObjs;

      function setMockCallbacks(id, cb) {
        if (!exprMockCallbacks) {
          exprMockCallbacks = {};
        }
        exprMockCallbacks[id] = cb;
      }

      // hook an operation callback
      function hookExpr(opName, callbacks) {
        exprBuilder.registerOpsBuilder(opName, MockExpression);
        setMockCallbacks(opName, callbacks);
      }

      beforeEach(async function () {
        exprMockCallbacks = null;
        globObjs = {};
        TriggerMachine = this.module().default;
        Expression = (await this.system.import('offers-v2/trigger_machine/expression')).default;
        ThrottleError = (await this.system.import('offers-v2/common/throttle-with-rejection')).ThrottleError;
        class mockClass extends Expression {
          constructor(data) {
            super(data);
            this.opName = this.getOpName();
            this.hasMockCallbacks = exprMockCallbacks && exprMockCallbacks[this.opName];
          }

          isBuilt() {
            if (this.hasMockCallbacks && exprMockCallbacks[this.opName].isBuilt) {
              return exprMockCallbacks[this.opName].isBuilt();
            }
            return true;
          }

          build() {
            if (this.hasMockCallbacks && exprMockCallbacks[this.opName].build) {
              return exprMockCallbacks[this.opName].build();
            }
            return undefined;
          }

          destroy() {
            if (this.hasMockCallbacks && exprMockCallbacks[this.opName].destroy) {
              return exprMockCallbacks[this.opName].destroy();
            }
            return undefined;
          }

          getExprValue(ctx) {
            if (this.hasMockCallbacks && exprMockCallbacks[this.opName].getExprValue) {
              return exprMockCallbacks[this.opName].getExprValue(ctx);
            }
            return Promise.resolve(true);
          }
        }
        MockExpression = mockClass;
        CategoryHandler = (await this.system.import('offers-v2/categories/category-handler')).default;
        Category = (await this.system.import('offers-v2/categories/category')).default;
        IntentHandler = (await this.system.import('offers-v2/intent/intent-handler')).default;
      });

      describe('#correctness_tests', function () {
        context('/basic simple tests', function () {
          let tm;
          beforeEach(function () {
            exprMockCallbacks = null;
            // env = new ExtensionEnvironment();
            // evLoop = new EventLoop(env);
            tm = new TriggerMachine(globObjs);
            exprBuilder = tm.expressionBuilder;
            chai.expect(exprBuilder).to.exist;
          });

          afterEach(function () {
            MockDate.reset();
          });

          it('/trigger machine can evaluate simple trigger', () => {
            const context = {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['$test_method', []]
              ]
            };
            let counter = 0;
            const callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then(() => {
              chai.expect(counter).to.be.equal(1);
            });
          });

          it('/invalid trigger doesnt run', () => {
            const context = {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              invalid_actions: [
                ['$test_method', []]
              ]
            };
            let counter = 0;
            const callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then(() => {
              chai.expect(counter).eql(0);
            }).catch((err) => {
              chai.expect(err).to.exist;
            });
          });


          it('/invalid operation cannot run', () => {
            const context = {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['$test_method', []]
              ]
            };
            return tm.run(t, context).then((result) => {
              chai.expect(result).eql(false);
            }).catch((err) => {
              chai.expect(err).to.exist;
            });
          });

          it('/invalid operation syntax cannot run', () => {
            const context = {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['test_method', []]
              ]
            };
            const callbacks = {
              getExprValue: () => Promise.resolve(true)
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(result).eql(false);
            }).catch((err) => {
              chai.expect(err).to.exist;
            });
          });

          it('/invalid operation syntax cannot run 2', () => {
            const context = {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                '$test_method', []
              ]
            };
            const callbacks = {
              getExprValue: () => Promise.resolve(true)
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then((result) => {
              chai.expect(result).eql(false);
            }).catch((err) => {
              chai.expect(err).to.exist;
            });
          });

          it('/multiple actions can run', () => {
            const context = {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['$log', ['this message']], ['$test_method', []]
              ]
            };
            let counter = 0;
            const callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then(() => {
              chai.expect(counter).eql(1);
            });
          });

          it('/multiple actions can run 2', () => {
            const context = {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['$test_method_num_2', []], ['$test_method', []]
              ]
            };
            let counter = 0;
            const callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            hookExpr('$test_method_num_2', callbacks);
            return tm.run(t, context).then(() => {
              chai.expect(counter).eql(2);
            });
          });

          it('/if first operation fails cannot run any', () => {
            const context = {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['$op_not_exist', ['this message']], ['$test_method', []]
              ]
            };
            let counter = 0;
            const callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then(() => {
              chai.expect(counter).eql(0);
            }).catch((err) => {
              chai.expect(err).to.exist;
            });
          });


          it('/if first operation fails cannot run any 2', () => {
            const context = {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: null,
              actions: [
                ['$test_method', []], ['$op_not_exist', ['this message']]
              ]
            };
            let counter = 0;
            const callbacks = {
              getExprValue: () => {
                counter += 1;
                return Promise.resolve(true);
              }
            };
            hookExpr('$test_method', callbacks);
            return tm.run(t, context).then(() => {
              chai.expect(counter).eql(0);
            }).catch((err) => {
              chai.expect(err).to.exist;
            });
          });

          it('/check lazy evaluation is working fine for and 1', () => {
            const context = {};
            const cond = [
              '$and', [
                ['$ret_true', []],
                ['$ret_false', []],
                ['$ret_true', []]
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            const retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            const retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then(() => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(1);
            });
          });

          it('/check lazy evaluation is working fine for and 2', () => {
            const context = {};
            const cond = [
              '$and', [
                ['$ret_true', []],
                ['$ret_true', []],
                ['$ret_true', []],
                ['$ret_false', []],
                ['$ret_true', []]
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            const retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            const retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then(() => {
              chai.expect(trueCounter, 'true counter').eql(3);
              chai.expect(falseCounter, 'false counter').eql(1);
            });
          });

          it('/check lazy evaluation is working fine for or 1', () => {
            const context = {};
            const cond = [
              '$or', [
                ['$ret_true', []],
                ['$ret_true', []],
                ['$ret_true', []],
                ['$ret_false', []],
                ['$ret_true', []]
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            const retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            const retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then(() => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(0);
            });
          });

          it('/check lazy evaluation is working fine for or 2', () => {
            const context = {};
            const cond = [
              '$or', [
                ['$ret_false', []],
                ['$ret_false', []],
                ['$ret_true', []],
                ['$ret_false', []],
                ['$ret_true', []]
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            const retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            const retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then(() => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(2);
            });
          });

          it('/check the operation cache is working properly', () => {
            const context = {};
            const cond = [
              '$or', [
                ['$ret_false', [], 100],
                ['$ret_true', []],
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            const retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            const retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then(() => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(1);
              trueCounter = 0;
              falseCounter = 0;
              return tm.run(t, context).then(() => {
                chai.expect(trueCounter, 'true counter').eql(1);
                chai.expect(falseCounter, 'false counter').eql(0);
              });
            });
          });

          it('/check the operation cache is working properly 2', () => {
            const context = {};
            const cond = [
              '$or', [
                ['$ret_false', [], 100],
                ['$ret_true', [], 100],
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            const retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            const retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then(() => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(1);
              trueCounter = 0;
              falseCounter = 0;
              return tm.run(t, context).then(() => {
                chai.expect(trueCounter, 'true counter').eql(0);
                chai.expect(falseCounter, 'false counter').eql(0);
              });
            });
          });

          it('/check the operation cache is working properly 3', () => {
            const context = {};
            const cond = [
              '$or', [
                ['$ret_false', []],
                ['$ret_true', []],
              ], 100
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            const retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            const retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            return tm.run(t, context).then(() => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(1);
              trueCounter = 0;
              falseCounter = 0;
              return tm.run(t, context).then(() => {
                chai.expect(trueCounter, 'true counter').eql(0);
                chai.expect(falseCounter, 'false counter').eql(0);
              });
            });
          });

          it('/check the operation cache ttl is working properly', () => {
            const context = {};
            const cond = [
              '$or', [
                ['$ret_false', [], 100],
                ['$ret_true', []],
              ]
            ];
            const t = {
              parent_trigger_ids: [],
              trigger_id: 'trigger-test',
              ttl: 3600,
              condition: cond,
              actions: []
            };
            let trueCounter = 0;
            const retTrueCallbacks = {
              getExprValue: () => {
                trueCounter += 1;
                return Promise.resolve(true);
              }
            };
            let falseCounter = 0;
            const retFalseCallbacks = {
              getExprValue: () => {
                falseCounter += 1;
                return Promise.resolve(false);
              }
            };
            hookExpr('$ret_true', retTrueCallbacks);
            hookExpr('$ret_false', retFalseCallbacks);
            MockDate.set(1000);
            return tm.run(t, context).then(() => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(1);
              trueCounter = 0;
              falseCounter = 0;
              MockDate.set(Date.now() + 99 * 1000);
              return tm.run(t, context).then(() => {
                chai.expect(trueCounter, 'true counter').eql(1);
                chai.expect(falseCounter, 'false counter').eql(0);
                trueCounter = 0;
                falseCounter = 0;
                MockDate.set(Date.now() + 99 * 1000);
                return tm.run(t, context).then(() => {
                  chai.expect(trueCounter, 'true counter').eql(1);
                  chai.expect(falseCounter, 'false counter').eql(1);
                });
              });
            });
          });
        });

        describe('/handle errors in triggers', () => {
          let objs;
          let triggerMachine;
          const ctx = { vars: {} };
          const triggerAction = sinon.stub();

          beforeEach(() => {
            triggerAction.reset();
            objs = {
              ...globObjs,
              // called while processing `$activate_intent`
              intent_handler: {
                isIntentActiveByName: () => false,
                activateIntent: triggerAction
              },
            };
            triggerMachine = new TriggerMachine(objs);
          });

          function setTriggers(triggers) {
            objs.trigger_cache.getSubtriggers = () => triggers;
          }

          function getValidTrigger() {
            return {
              trigger_id: 'validTrigger',
              condition: ['$not', [['$and']]], // calculates to `true`
              actions: [
                ['$activate_intent', [
                  { durationSecs: 86400,
                    name: 'mytoys_intent' }]]],
            };
          }

          function getInvalidTrigger() {
            return {
              ...getValidTrigger(),
              trigger_id: 'invalidTrigger',
              condition: ['$no_such_command'],
            };
          }

          it('/do not execute actions for a failing trigger', async () => {
            setTriggers([getInvalidTrigger()]);

            await triggerMachine.runRoot(ctx);

            chai.expect(triggerAction).to.be.not.called;
          });

          it('/skip subtrigger with an error, execute other subtriggers', async () => {
            setTriggers([getInvalidTrigger(), getValidTrigger()]);

            await triggerMachine.runRoot(ctx);

            chai.expect(triggerAction).to.be.calledOnce;
          });
        });

        describe('/offer is only for new users (integration-style test)', () => {
          let objs;
          let triggerMachine;
          let categoryHandler;
          let intentHandler;
          let segmentCat;
          const ctx = { vars: {} };
          const queryMock = sinon.stub();

          function resetQueryMock(perDayStat) {
            queryMock.reset();
            queryMock.returns({ pid: 'segment.mytoys_existing_customer|1',
              d: { match_data: { per_day: perDayStat } } });
          }

          function setupInfrastructure() {
            const simpleDb = persistenceMocks['core/persistence/simple-db'];
            simpleDb.reset();
            const historyFeature = {
              isAvailable: () => true,
              performQueryOnHistory: queryMock,
            };
            const DbProto = simpleDb.default;
            categoryHandler = new CategoryHandler(historyFeature);
            categoryHandler.init(new DbProto());
            intentHandler = new IntentHandler();
            objs = {
              category_handler: categoryHandler,
              intent_handler: intentHandler,
            };
            triggerMachine = new TriggerMachine(objs);
          }

          function setupOffer() {
            // Offer category
            const mytoysCat = new Category('tempcat_mytoys');
            sinon.stub(mytoysCat, 'isActive').returns(true);
            categoryHandler.addCategory(mytoysCat);

            // Segment category
            segmentCat = new Category('segment.mytoys_existing_customer', [], 1);
            segmentCat.timeRangeSecs = 60 * 60 * 24 * 30;
            categoryHandler.addCategory(segmentCat);
            chai.expect(segmentCat.isHistoryDataSettedUp()).to.be.false;

            // History
            resetQueryMock({});

            // Rule
            const triggers = [{ condition: [
              '$and', [
                ['$is_category_active', [
                  { catName: 'tempcat_mytoys' }]],
                ['$not',
                  [['$probe_segment', [
                    'segment.mytoys_existing_customer',
                    { min_matches: 1, duration_days: 1000 }]]]],
                ['$gt', [
                  ['$get_variable', ['segment_confidence', 0]],
                  0.75]]]],
            actions: [
              ['$activate_intent', [
                { durationSecs: 86400,
                  name: 'mytoys_intent' }]]] }];
            objs.trigger_cache.getSubtriggers = () => triggers;
          }

          async function waitForHistoryLoaded() {
            await waitFor(() =>
              chai.expect(segmentCat.isHistoryDataSettedUp()).to.be.true);
          }

          beforeEach(() => {
            setupInfrastructure();
            setupOffer();
          });

          it('/disable offer based on history data', async () => {
            // Arrange: load history
            const yesterdayKey = moment().subtract(1, 'd').format('YYYYMMDD');
            resetQueryMock({ [yesterdayKey]: { m: 3 } });
            await triggerMachine.runRoot(ctx);
            await waitForHistoryLoaded();
            resetQueryMock({});

            // Act
            await triggerMachine.runRoot(ctx);

            // Assert: no offer
            const isIntentActive = intentHandler.isIntentActiveByName('mytoys_intent');
            chai.expect(isIntentActive, 'intent active').to.be.false;

            // Assert: no call to history
            await waitForHistoryLoaded();
            sinon.assert.notCalled(queryMock);
          });

          it('/show offer based on history data', async () => {
            // Arrange: load history
            resetQueryMock({});
            await triggerMachine.runRoot(ctx);
            await waitForHistoryLoaded();
            resetQueryMock({});

            // Act
            await triggerMachine.runRoot(ctx);

            // Assert: offer
            const isIntentActive = intentHandler.isIntentActiveByName('mytoys_intent');
            chai.expect(isIntentActive, 'intent active').to.be.true;

            // Assert: no call to history
            await waitForHistoryLoaded();
            sinon.assert.notCalled(queryMock);
          });

          it('/disable offer if probe_segment returns low confidence', async () => {
            queryMock.throws(new ThrottleError('UnitTest'));

            await triggerMachine.runRoot(ctx);

            // Assert: no offer
            const isIntentActive = intentHandler.isIntentActiveByName('mytoys_intent');
            chai.expect(isIntentActive, 'intent active').to.be.false;
          });
        });
      });
    });
  });
