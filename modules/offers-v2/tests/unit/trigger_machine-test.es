/* global chai */
/* global describeModule */
/* global require */

const commonMocks = require('./utils/common');

let currentTS = Date.now();
let mockedTimestamp = Date.now() / 1000;
const currentDayHour = 0;
const currentWeekDay = 0;
const abNumber = 0;


export default describeModule('offers-v2/trigger_machine/trigger_machine',
  () => ({
    ...commonMocks,
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
    'offers-v2/utils': {
      timestamp: function () {
        return mockedTimestamp;
      },
      timestampMS: function () {
        return currentTS;
      },
      dayHour: function () {
        return currentDayHour;
      },
      weekDay: function () {
        return currentWeekDay;
      },
      getABNumber: function () {
        return abNumber;
      },
      hashString: function (str) {
        /* eslint-disable no-bitwise */
        let hash = 5381;
        for (let i = 0, len = str.length; i < len; i += 1) {
          hash = (hash * 33) ^ str.charCodeAt(i);
        }
        // For higher values, we cannot pack/unpack
        return (hash >>> 0) % 2147483648;
      }
    },
  }),
  () => {
    describe('trigger_machine', function () {
      // here we will define all the modules we need / depend on for the
      // construction of the event loop and different objects,
      // we may need to refactor the code to make this clear later
      // some of the modules will be mocked some others not
      let TriggerMachine;
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

      beforeEach(function () {
        exprMockCallbacks = null;
        globObjs = {};
        TriggerMachine = this.module().default;
        const pTriggerCache = this.system.import('offers-v2/trigger_machine/trigger_cache');
        const promExpBuilder = this.system.import('offers-v2/trigger_machine/exp_builder');
        const promExpression = this.system.import('offers-v2/trigger_machine/expression');
        const pList = [pTriggerCache, promExpBuilder, promExpression];
        return Promise.all(pList).then((mods) => {
          Expression = mods[2].default;
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
        });
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
            currentTS = 1000;
            mockedTimestamp = currentTS / 1000;
            return tm.run(t, context).then(() => {
              chai.expect(trueCounter, 'true counter').eql(1);
              chai.expect(falseCounter, 'false counter').eql(1);
              trueCounter = 0;
              falseCounter = 0;
              currentTS += 99 * 1000;
              mockedTimestamp = currentTS / 1000;
              return tm.run(t, context).then(() => {
                chai.expect(trueCounter, 'true counter').eql(1);
                chai.expect(falseCounter, 'false counter').eql(0);
                trueCounter = 0;
                falseCounter = 0;
                currentTS += 99 * 1000;
                return tm.run(t, context).then(() => {
                  chai.expect(trueCounter, 'true counter').eql(1);
                  chai.expect(falseCounter, 'false counter').eql(1);
                });
              });
            });
          });

          // TODO: tests:
          // - different engine version doesnt run
          // - trigger machinery test cases
          // - different syntax checks on the "triggers language", proper and not
          //   proper syntax cases
          //
          // - operations and arguments are properly passed
          // - no conditions (context):
          //  - simple action work
          //  - multiple actions are properly executed
          //
        });
      });

      // - operations are properly executed (each one context)
      // describe('#operations tests', function () {
      //   context('if_pref operation', function () {
      //     let op;
      //     beforeEach(function () {
      //       const opEx = new OperationExecutor();
      //       op = opEx.operations['$if_pref'];
      //     });

      //     it('check exists', () => {
      //       chai.expect(op).to.exist;
      //     });

      //   });
      // });
    });
  });
