/* global chai */
/* global describeModule */
/* global require */



export default describeModule('offers-v2/trigger_machine',
  () => ({
    './logging_handler': {
      default: {}
      // LOG_ENABLED: true,
      // default: class LoggingHandler{
      //   error(mod, msg) {
      //     console.log(mod, msg);
      //   },
      //   warning(mod, msg) {
      //     console.log(mod, msg);
      //   }
      // }
    },
    'core/platform': {
      isChromium: false
    },
    'core/cliqz': {
      default: {
        setInterval: function () {}
      },
      utils: {
        setInterval: function () {}
      }
    },
    'core/crypto/random': {
    },
    'platform/console': {
      default: {}
    },
    // mocks
    './history_index': {
      default: class {
        constructor(el) {
          // TODO
        }
        queryHistory() {
          // TODO
        }
        addUrl() {
          // TODO
        }
        save() {
          // TODO
        }
        load() {
          // TODO
        }
        timestamp() {
          return Math.round(Date.now() / 1000);
        }
      }
    },
    './environments/extension_environment': {
      default: class {
        constructor() {}

        onUrlChange(listener) {
          // TODO
          this.urlChangeListener = listener;
        }

        // this should be the url which is OPEN
        emitUrlChange(url, urlObj) {
          // TODO
          this.urlChangeListener(url, urlObj);
        }

        // activates http request events for specified domains
        watchDomain(domain) {
          // TODO
        }

        queryHistory(start, end) {
          // TODO
        }

        sendApiRequest(endpoint, params) {
          // TODO
        }

        info(mod, msg) {}

        error(mod, msg) {}

        warning(mod, msg) {}

        displayOffer(offerId, ruleInfo) {
          // TODO
        }

        addOffer(offerInfo) {
          // TODO
        }

        isOfferPresent(offerID) {
          // TODO
        }

        getOfferLastUpdate(offerId, signal) {
          // TODO
        }

        sendSignal(offerId, key) {
          // TODO
        }

        getPref(pref,default_val) {
          // TODO
        }

        getABNumber() {
          // TODO
          return 1;
        }
      }
    },
    // './event_loop': {
    //   default: class {
    //     constructor(env) {
    //       this.environment = env;
    //     }
    //   }
    // },
  }),
  () => {
    describe('trigger_machine', function() {
      // here we will define all the modules we need / depend on for the
      // construction of the event loop and different objects,
      // we may need to refactor the code to make this clear later
      // some of the modules will be mocked some others not
      let ExtensionEnvironment;
      let HistoryIndex;
      let TriggerMachine;
      let RegexpCache;
      let OperationExecutor;
      let TriggerCache;
      let EventLoop;
      beforeEach(function () {
        ExtensionEnvironment = this.deps('./environments/extension_environment').default;
        HistoryIndex = this.deps('./history_index').default;
        TriggerMachine = this.module().default;
        const pRegexpCache = System.import('offers-v2/regexp_cache');
        const pOperationExecutor = System.import('offers-v2/operation_executor');
        const pTriggerCache = System.import('offers-v2/trigger_cache');
        const pEventLoop = System.import('offers-v2/event_loop');
        const pList = [pRegexpCache, pOperationExecutor, pTriggerCache, pEventLoop];
        return Promise.all(pList).then((mods) => {
          RegexpCache = mods[0].default;
          OperationExecutor = mods[1].default;
          TriggerCache = mods[2].default;
          EventLoop = mods[3].default;
        });
      });

      // hook an operation callback
      function hookOp(opName, callback) {
        evLoop.operationExecutor.operations[opName] = callback;
      }

      describe('#correctness_tests', function () {
        context('basic simple tests', function () {
          let env;
          let evLoop;
          let tm;
          beforeEach(function () {
            env = new ExtensionEnvironment();
            evLoop = new EventLoop(env);
            tm = evLoop.triggerMachine;
          });

          // We will create this function here so when we change the interface
          // on how evaluate an operation (individually)
          function hookOp(opName, callback) {
            evLoop.operationExecutor.operations[opName] = callback;
          }

          xit('trigger machine can evaluate simple trigger', () => {
            const context =  {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: this.triggersRoot,
              ttl: 3600,
              condition: null,
              actions: [
                ['$test_method', []]
              ]
            };
            let counter = 0;
            hookOp('$test_method', (args, evLoop, ctx) => {
              counter += 2;
              return Promise.resolve();
            });
            return tm.run(t, context).then(() => {
              chai.expect(counter).to.be.equal(2);
            });
          });

          xit('trigger machine can evaluate simple trigger', () => {
            const context =  {};
            const t = {
              parent_trigger_ids: [],
              trigger_id: this.triggersRoot,
              ttl: 3600,
              condition: ['$true_op', []],
              actions: [
                ['$test_method', []]
              ]
            };
            hookOp('$true_op', (args, evLoop, ctx) => {
              return Promise.resolve(true);
            });
            hookOp('$false_op', (args, evLoop, ctx) => {
              return Promise.resolve(false);
            });
            let counter = 0;
            hookOp('$test_method', (args, evLoop, ctx) => {
              counter += 2;
              return Promise.resolve();
            });
            return tm.run(t, context).then(() => {
              chai.expect(counter).to.be.equal(2);
            });
          });


          // TODO: tests:
          // - invalid triggers doesnt run
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
      describe('#operations tests', function () {
        context('if_pref operation', function () {
          let op;
          beforeEach(function () {
            const opEx = new OperationExecutor();
            op = opEx.operations['$if_pref'];
          });

          it('check exists', () => {
            chai.expect(op).to.exist;
          });

        });
      });

    });
  }
);
