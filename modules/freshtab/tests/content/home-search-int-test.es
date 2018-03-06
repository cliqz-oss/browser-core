import {
  clearIntervals,
  clone,
  defaultConfig,
  expect,
  Subject,
  waitFor
} from './helpers';

describe('Fresh tab interactions with search', function () {
  const searchAreaSelector = 'div.search input';
  let subject;
  let messages;
  let listener;
  let searchConfig;

  beforeEach(function () {
    subject = new Subject();
    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

    subject.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: {
        history: [],
        custom: []
      },
    });
    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: []
      }
    });

    searchConfig = clone(defaultConfig);
    searchConfig.response.componentsState.search.visible = true;
    subject.respondsWith(searchConfig);

    return subject.load().then(() => {
      // Keep track of received messages
      messages = new Map();
      listener = function (msg) {
        if (!messages.has(msg.action)) {
          messages.set(msg.action, []);
        }

        messages.get(msg.action).push(msg);
      };
      subject.chrome.runtime.onMessage.addListener(listener);
    });
  });

  afterEach(function () {
    subject.chrome.runtime.onMessage.removeListener(listener);
    subject.unload();
    clearIntervals();
  });

  context('when search bar is not focused', function () {
    let input;

    beforeEach(function () {
      input = subject.query(searchAreaSelector);
      input.focus();
      return waitFor(() => input === subject.activeElement);
    });

    describe('focusing on the input field', function () {
      /* TODO: fix me */
      xit('sends a "search_bar > focus" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);
        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);
        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].target === 'search_bar') &&
              (item.args[0].action === 'focus')) {
                signalExist = true;
                count += 1;
          }
        });

        expect(signalExist).to.be.true;
        expect(count).to.equal(1);
      });

      describe('and then moving the focus outside the input field', function () {
        beforeEach(function () {
          input.blur();
          return waitFor(() => input !== subject.activeElement);
        });

        /* TODO: fix me */
        xit('sends a "search_bar > blur" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);
          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].target === 'search_bar') &&
                (item.args[0].action === 'blur')) {
                  signalExist = true;
                  count += 1;
            }
          });

          expect(signalExist).to.be.true;
          expect(count).to.equal(1);
        });
      });
    });
  });
});
