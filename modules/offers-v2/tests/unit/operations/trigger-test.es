/* global chai */
/* global describeModule */
/* global require */
/* eslint-disable func-names,prefer-arrow-callback,arrow-body-style */

export default describeModule('offers-v2/operations/trigger',
  () => ({
  }),
  () => {
    describe('/trigger operations', () => {
      let ops;
      let eventLoop;
      let resultsHookedFunc = [];

      function mockEventLoop(obj) {
        eventLoop = obj;
      }

      function hookedFunc(...args) {
        resultsHookedFunc.push(args);
      }

      beforeEach(function () {
        ops = this.module().default;
      });

      /**
       * ==================================================
       * $watch_requests operation tests
       * ==================================================
       */
      describe('/watch_requests', () => {
        let op;
        beforeEach(function () {
          op = ops.$watch_requests;
          resultsHookedFunc = [];
        });

        it('/simple test', () => {
          mockEventLoop({
            environment: {
              watchDomain: domain => {},
            }
          });

          return Promise.all([
            op.call(this, ['amazon.com'], eventLoop).then(
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
       * $activate_subtriggers operation tests
       * ==================================================
       */
      describe('/activate_subtriggers', () => {
        let op;
        beforeEach(function () {
          op = ops.$activate_subtriggers;
          resultsHookedFunc = [];
        });

        it('/fetch (empty) subtriggers', () => {
          mockEventLoop({
            triggerCache: {
              getSubtriggers: parentTriggerId => parentTriggerId === 'root' ? [] : null,
              setSubtriggers: (parentTriggerId, substriggers) => {},
              addTrigger: trigger => {},
            },
            environment: {
              info: () => {},
              sendApiRequest: (action, id) => new Promise((resolve, reject) => resolve([])),
            },
            triggerMachine: {
              run: (trigger, context) => {},
              isTriggerBeingEvaluated: (t) => false,
            }
          });

          return Promise.all([
            op.call(this, ['root'], eventLoop, {}).then(
              (result) => {
                chai.expect(result).eql(undefined);
              },
              (error) => {
                chai.assert.fail(error, undefined, error);
              }
            ),
          ]);
        });

        it('/fetch and activate subtriggers', () => {
          mockEventLoop({
            triggerCache: {
              getSubtriggers: parentTriggerId => parentTriggerId === 'root' ? [] : null,
              setSubtriggers: (parentTriggerId, substriggers) => {},
              addTrigger: trigger => {},
            },
            environment: {
              info: () => {},
              sendApiRequest: (action, id) => new Promise((resolve, reject) => resolve([
                { trigger_id: 1 },
                { trigger_id: 2 }])),
            },
            triggerMachine: {
              run: (trigger, context) => hookedFunc(trigger, context),
              isTriggerBeingEvaluated: (t) => false,
            }
          });

          return Promise.all([
            op.call(this, ['root'], eventLoop, {}).then(
              (result) => {
                chai.expect(result).eql(undefined);
                chai.expect(resultsHookedFunc).eql([[
                  { trigger_id: 1 }, { _currentTriggerLevel: 1 }],
                  [{ trigger_id: 2 }, { _currentTriggerLevel: 1 }]]);
              },
              (error) => {
                chai.assert.fail(error, undefined, error);
              }
            ),
          ]);
        });

        it('/read cached subtriggers and activate them', () => {
          mockEventLoop({
            triggerCache: {
              getSubtriggers: parentTriggerId => parentTriggerId === 'root' ? [
                { trigger_id: 1 },
                { trigger_id: 2 }] : null,
            },
            triggerMachine: {
              run: (trigger, context) => hookedFunc(trigger, context),
              isTriggerBeingEvaluated: (t) => false,
            }
          });

          return Promise.all([
            op.call(this, ['root'], eventLoop, {}).then(
              (result) => {
                chai.expect(result).eql(undefined);
                chai.expect(resultsHookedFunc).eql([[
                  { trigger_id: 1 }, { _currentTriggerLevel: 1 }],
                  [{ trigger_id: 2 }, { _currentTriggerLevel: 1 }]]);
              },
              (error) => {
                chai.assert.fail(error, undefined, error);
              }
            ),
          ]);
        });
      });
    });
  },
);
