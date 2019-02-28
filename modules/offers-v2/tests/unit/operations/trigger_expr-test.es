/* global chai */
/* global describeModule */
/* global require */
/* global sinon */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */

const commonMocks = require('../utils/common');
const beMocks = require('../utils/offers/intent');

const BackendConnectorMock = beMocks['offers-v2/backend-connector'].BackendConnectorMock;

const currentTS = Date.now();
const mockedTimestamp = Date.now() / 1000;
const currentDayHour = 0;
const currentWeekDay = 0;
const abNumber = 0;
let shouldKeepResourceRet = false;

const copy = e => JSON.parse(JSON.stringify(e));

class TriggerMachineMock {
  constructor() {
    this.runCalls = [];
  }

  clear() {
    this.runCalls = [];
  }

  run(trigger, ctx) {
    this.runCalls.push({ trigger: copy(trigger), ctx });
    return Promise.resolve(true);
  }
}

export default describeModule('offers-v2/trigger_machine/ops/trigger_expr',
  () => ({
    ...commonMocks,
    ...beMocks,
    'core/http': {
      default: {}
    },
    'platform/xmlhttprequest': {
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
      shouldKeepResource: function () {
        return shouldKeepResourceRet;
      },
    },
    'offers-v2/trigger_machine/trigger_cache': {
      default: class {
        constructor() {
          this.triggersAdded = [];
          this.parentTriggerId = null;
          this.subtriggers = null;
          this.triggerId = null;
          this.retSubtriggers = [];
        }

        addTrigger(t) {
          this.triggersAdded.push(t);
        }

        setSubtriggers(parentTriggerId, subtriggers) {
          this.parentTriggerId = parentTriggerId;
          this.subtriggers = subtriggers;
        }

        getSubtriggers(triggerId) {
          this.triggerId = triggerId;
          return this.retSubtriggers;
        }

        clear() {
          this.triggersAdded = [];
          this.parentTriggerId = null;
          this.subtriggers = null;
          this.triggerId = null;
          this.retSubtriggers = [];
        }
      }
    },
    'core/cliqz': {
      default: {},
      utils: {
        setInterval: function () {},
      }
    },
  }),
  () => {
    describe('/trigger operations', () => {
      let buildDataGen;
      let exprBuilder;
      let ExpressionBuilder;
      let TriggerMachine;
      let triggerCacheMock;
      let tmeMock;
      let beConnMock;
      let ActivateSubtriggersExpr;

      function buildOp(obj) {
        // wrap into a trigger here
        const t = {
          parent_trigger_ids: [],
          trigger_id: 'trigger-test',
          ttl: 3600,
          condition: null,
          actions: obj
        };
        return exprBuilder.createExp(obj, t);
      }

      function buildAndExec(op, ctx) {
        const e = buildOp(op);
        return e.evalExpr(ctx);
      }

      function checkTriggersCalled(tIdlist) {
        const runTriggers = new Set();
        tmeMock.runCalls.forEach(pair => runTriggers.add(pair.trigger.trigger_id));
        chai.expect(runTriggers.size, 'there are more or less elements than expected').eql(tIdlist.length);
        tIdlist.forEach(tid =>
          chai.expect(runTriggers.has(tid), `missing trigger id: ${tid}`).eql(true));
      }

      beforeEach(async function () {
        const TriggerCache = this.deps('offers-v2/trigger_machine/trigger_cache').default;
        triggerCacheMock = new TriggerCache();
        tmeMock = new TriggerMachineMock();
        beConnMock = new BackendConnectorMock();
        ActivateSubtriggersExpr = this.module().default.$activate_subtriggers;

        buildDataGen = {
          trigger_machine: tmeMock,
          be_connector: beConnMock,
          trigger_cache: triggerCacheMock,
        };

        ExpressionBuilder = (await this.system.import('offers-v2/trigger_machine/exp_builder')).default;
        exprBuilder = new ExpressionBuilder(buildDataGen);
        TriggerMachine = (await this.system.import('offers-v2/trigger_machine/trigger_machine')).default;
      });


      /**
       * ==================================================
       * $activate_subtriggers operation tests
       * ==================================================
       */
      describe('/activate_subtriggers', () => {
        let op;
        let ctx;
        beforeEach(function () {
          ctx = {};
          beConnMock.clear();
          triggerCacheMock.clear();
        });

        it('/invalid args', () => {
          const o = ['$activate_subtriggers', []];
          op = buildOp(o);
          return op.evalExpr(ctx).then((result) => {
            chai.assert.fail(result, 'error');
          }).catch((err) => {
            chai.expect(err).to.exist;
          });
        });


        it('/fetch simple subtriggers', () => {
          // setup the environment
          const retTriggers = [
            {
              trigger_id: 't1',
              actions: [],
              conditions: [],
            },
            {
              trigger_id: 't2',
              actions: [],
              conditions: [],
            },
            {
              trigger_id: 't3',
              actions: [],
              conditions: [],
            }
          ];

          beConnMock.ret = retTriggers;

          const o = ['$activate_subtriggers', ['root']];
          return buildAndExec(o, ctx).then(() => {
            checkTriggersCalled(['t1', 't2', 't3']);
          }).catch((err) => {
            chai.expect(false, `unexpected error: ${err}`).eql(true);
          });
        });

        it('/check user_group filtering works for undefined', () => {
          // setup the environment
          const retTriggers = [
            {
              trigger_id: 't1',
              actions: [],
              conditions: [],
            },
            {
              user_group: 50,
              trigger_id: 't2',
              actions: [],
              conditions: [],
            },
            {
              user_group: 100,
              trigger_id: 't3',
              actions: [],
              conditions: [],
            }
          ];

          beConnMock.ret = retTriggers;

          const o = ['$activate_subtriggers', ['root']];
          // filter all except the ones that doesnt have
          shouldKeepResourceRet = false;
          return buildAndExec(o, ctx).then(() => {
            checkTriggersCalled(['t1']);
          }).catch((err) => {
            chai.expect(false, `unexpected error: ${err}`).eql(true);
          });
        });

        it('/check user_group filtering works for proper value', () => {
          // setup the environment
          const retTriggers = [
            {
              trigger_id: 't1',
              actions: [],
              conditions: [],
            },
            {
              user_group: 50,
              trigger_id: 't2',
              actions: [],
              conditions: [],
            },
            {
              user_group: 100,
              trigger_id: 't3',
              actions: [],
              conditions: [],
            }
          ];

          beConnMock.ret = retTriggers;

          const o = ['$activate_subtriggers', ['root']];
          // filter all except the ones that doesnt have
          shouldKeepResourceRet = true;
          return buildAndExec(o, ctx).then(() => {
            checkTriggersCalled(['t1', 't2', 't3']);
          }).catch((err) => {
            chai.expect(false, `unexpected error: ${err}`).eql(true);
          });
        });

        it('/reset variables before running a trigger', async () => {
          const trackVars = sinon.spy();
          class VarAccessMock {
            evalExpr(localCtx) {
              trackVars({ ...localCtx.vars });
              localCtx.vars.smth = 'else'; // eslint-disable-line no-param-reassign
              return Promise.resolve(false);
            }
          }
          const vam = {
            built_conds: new VarAccessMock(),
            built_actions: [],
          };
          const subtriggerCache = {
            getSubtriggers: () => [vam, vam, vam],
          };
          const e = new ActivateSubtriggersExpr({
            trigger_cache: subtriggerCache,
            raw_op: { args: ['smth'] },
            trigger_machine: new TriggerMachine({}),
          });

          await e.evalExpr(ctx);

          chai.expect(trackVars.firstCall.args[0]).to.eql({});
          chai.expect(trackVars.secondCall.args[0]).to.eql({});
          chai.expect(trackVars.thirdCall.args[0]).to.eql({});
        });
      });
    });
  });
