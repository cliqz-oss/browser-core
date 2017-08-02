/* global chai */
/* global describeModule */
/* global require */



export default describeModule('offers-v2/history_index',
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
    'platform/console': {
      default: {}
    },
  }),
  () => {
    describe('history index', function() {
      let HistoryIndex;
      beforeEach(function () {
        HistoryIndex = this.module().default;
      });

      describe('#correctness_tests', function () {
        context('proper build url data', function () {
          beforeEach(function () {
          });

        });
      });
    })
  }
);
