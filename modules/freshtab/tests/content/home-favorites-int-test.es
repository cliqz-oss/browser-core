import {
  clearIntervals,
  clone,
  expect,
  waitFor
} from '../../core/test-helpers';
import {
  defaultConfig,
  generateFavResponse,
  Subject
} from '../../core/test-helpers-freshtab';

const amazonDial = {
  title: 'http://amazon.de/',
  id: 'amazon.de/',
  url: 'http://amazon.de/',
  displayTitle: 'amazon.de',
  custom: true,
  logo: {
    backgroundColor: 'ff951d',
    backgroundImage: 'url(https://cdn.cliqz.com/brands-database/database/1502005705085/logos/amazon/$.svg)',
    text: 'am',
    color: '#fff',
    buttonsClass: 'cliqz-brands-button-2',
    style: 'background-color: #ff951d;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1502005705085/logos/amazon/$.svg); text-indent: -10em;'
  }
};

describe('Fresh tab interactions with favorites', function () {
  const dialSelector = '#section-favorites .dial:not(.dial-plus)';
  const plusSelector = '#section-favorites .dial-plus';
  const plusBtnSelector = 'button.plus-dial-icon';
  const dialTitleSelector = '.title';
  const deleteBtnSelector = 'button.delete';
  const undoBoxSelector = '.undo-notification-box';
  const favoritesAreaSelector = '#section-favorites';
  const favoritesResponse = generateFavResponse();

  let $initialDials;
  let $dialToDelete;
  let deletedTitle;
  let $deletedBtn;
  let $afterClickDials;
  let subject;
  let messages;
  let listener;

  beforeEach(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();

    subject.respondsWithEmptyNews();

    const favConfig = clone(defaultConfig);
    favConfig.response.componentsState.customDials.visible = true;
    subject.respondsWith(favConfig);
  });

  afterEach(function () {
    clearIntervals();
  });

  context('when favorites have just one element', function () {
    const addFormSelector = 'form.addDialForm';

    beforeEach(async function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: favoritesResponse[0],
      });

      await subject.load();

      // Keep track of received messages
      messages = new Map();
      listener = function (msg) {
        if (!messages.has(msg.action)) {
          messages.set(msg.action, []);
        }

        messages.get(msg.action).push(msg);
      };
      subject.chrome.runtime.onMessage.addListener(listener);
      $initialDials = subject.queryAll(dialSelector);
      $dialToDelete = $initialDials[0];
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
      subject.unload();
    });

    describe('clicking on the element', function () {
      beforeEach(function () {
        const logoSelector = '.logo';
        $dialToDelete.querySelector(logoSelector).click();
      });

      it('sends a "favorite > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].target === 'favorite' &&
            s.args[0].action === 'click'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on the "+" element', function () {
      beforeEach(function () {
        subject.query(plusBtnSelector).click();
        return waitFor(() => (subject.query(addFormSelector)));
      });

      it('renders an "Add a favorite" form', function () {
        expect(subject.getComputedStyle(subject.query(addFormSelector).parentNode).display)
          .to.not.contain('none');
      });

      it('renders an "Add a favorite" form in a correct position', function () {
        expect(subject.queryAll('#section-favorites .dial')[1]
          .contains(subject.query(addFormSelector))).to.be.true;
      });

      it('does not render the "+" button anymore', function () {
        expect(subject.getComputedStyle(subject.query(plusBtnSelector).parentNode).display)
          .to.contain('none');
      });

      it('sends a "add_favorite > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].target === 'add_favorite' &&
            s.args[0].action === 'click'
          );
        }).length;

        expect(count).to.equal(1);
      });

      describe("then clicking on the form's close button", function () {
        beforeEach(function () {
          subject.query('button.hideAddForm').click();
          return waitFor(() => subject.query(addFormSelector).parentNode.style.display === 'none');
        });

        it('renders a "+" button', function () {
          expect(subject.getComputedStyle(subject
            .query(plusBtnSelector).parentNode).display)
            .to.not.contain('none');
        });

        it('does not render the "Add a favorite" form anymore', function () {
          expect(subject.getComputedStyle(subject.query(addFormSelector).parentNode).display)
            .to.contain('none');
        });

        it('sends a "add_favorite > close > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].view === 'add_favorite' &&
              s.args[0].target === 'close' &&
              s.args[0].action === 'click'
            );
          }).length;

          expect(count).to.equal(1);
        });
      });
    });

    describe('simulating adding a new favorite element', function () {
      beforeEach(async function () {
        subject.respondsWith({
          module: 'freshtab',
          action: 'getSpeedDials',
          response: favoritesResponse[0],
        });

        subject.respondsWith({
          module: 'freshtab',
          action: 'addSpeedDial',
          response: amazonDial,
        });

        const addButton = subject.query(plusBtnSelector);
        addButton.click();
        await waitFor(() => subject.query(addFormSelector).parentElement.style.display !== 'none');
        subject.query('form.addDialForm input.addUrl').value = 'aaaa';
        subject.query('form.addDialForm button.submit').click();
      });

      it('renders a new favorite in the list', function () {
        expect(subject.queryAll('#section-favorites .dial:not(.dial-plus)').length)
          .to.equal(2);
        expect(subject.queryAll('#section-favorites .dial')[1]
          .querySelector('.title')).to.contain.text(amazonDial.displayTitle);
      });

      it('renders the "+" button as the last element', function () {
        const allDialsSelector = '#section-favorites .dial';
        const allDialsItems = subject.queryAll(allDialsSelector);
        expect(allDialsItems.length).to.equal(3);
        expect(allDialsItems[2].className).to.contain('dial-plus');
      });

      it('sends a "add_favorite > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].target === 'add_favorite' &&
            s.args[0].action === 'click'
          );
        }).length;

        expect(count).to.equal(1);
      });

      it('sends a "add_favorite > add > click" telemetry signal', function () {
        expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let count = 0;

        expect(telemetrySignals.length).to.be.above(0);

        count = telemetrySignals.filter(function (s) {
          return (
            s.args[0].type === 'home' &&
            s.args[0].view === 'add_favorite' &&
            s.args[0].target === 'add' &&
            s.args[0].action === 'click'
          );
        }).length;

        expect(count).to.equal(1);
      });
    });

    describe('clicking on a delete button of the element', function () {
      beforeEach(function () {
        deletedTitle = $dialToDelete
          .querySelector(dialTitleSelector).textContent;
        $deletedBtn = $dialToDelete.querySelector(deleteBtnSelector);
        $deletedBtn.click();
        return waitFor(() => (subject.query(undoBoxSelector)));
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
      });

      describe('of the first element', function () {
        it('removes the element', function () {
          expect(deletedTitle).to.equal(favoritesResponse[0].custom[0].displayTitle);
        });

        it('does not render any favorites elements', function () {
          expect(subject.queryAll(dialSelector).length).to.equal(0);
        });

        it('renders only the "+" element', function () {
          expect(subject.queryAll(plusSelector).length).to.equal(1);
        });

        it('renders a popup with undo message', function () {
          expect(subject.query(undoBoxSelector)).to.exist;
        });

        it('still renders the most visited area', function () {
          expect(subject.query(favoritesAreaSelector)).to.exist;
        });

        it('sends a "removeSpeedDial" message', function () {
          expect(messages.has('removeSpeedDial')).to.equal(true);
          expect(messages.get('removeSpeedDial').length).to.equal(1);
        });

        it('sends a "delete_favorite > click" telemetry signal', function () {
          expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let count = 0;

          expect(telemetrySignals.length).to.be.above(0);

          count = telemetrySignals.filter(function (s) {
            return (
              s.args[0].type === 'home' &&
              s.args[0].target === 'delete_favorite' &&
              s.args[0].action === 'click'
            );
          }).length;

          expect(count).to.equal(1);
        });

        describe('then clicking on a close button of the undo popup', function () {
          const undoPopupCloseBtnSelector = '.undo-notification-box button.close';

          beforeEach(async function () {
            subject.query(undoPopupCloseBtnSelector).click();
            await waitFor(() => !(subject.query(undoBoxSelector)));
            $afterClickDials = subject.queryAll(dialSelector);
          });

          it('removes the popup', function () {
            expect(subject.query(undoBoxSelector)).to.not.exist;
          });

          it('still does not render any favorites elements', function () {
            expect($afterClickDials.length).to.equal(0);
          });

          it('still renders the "+" element', function () {
            expect(subject.queryAll(plusSelector).length).to.equal(1);
          });

          it('sends a "notification > close > click" telemetry signal', function () {
            expect(messages.has('sendTelemetry')).to.equal(true);

            const telemetrySignals = messages.get('sendTelemetry');
            let count = 0;

            expect(telemetrySignals.length).to.be.above(0);

            count = telemetrySignals.filter(function (s) {
              return (
                s.args[0].type === 'home' &&
                s.args[0].view === 'notification' &&
                s.args[0].target === 'close' &&
                s.args[0].action === 'click'
              );
            }).length;

            expect(count).to.equal(1);
          });
        });

        describe('then clicking on an undo button of the undo popup', function () {
          const undoPopupUndoBtnSelector = '.undo-notification-box button.undo';

          beforeEach(async function () {
            subject.query(undoPopupUndoBtnSelector).click();
            await waitFor(() => !(subject.query(undoBoxSelector)));
            $afterClickDials = subject.queryAll(dialSelector);
          });

          it('removes the popup', function () {
            expect(subject.query(undoBoxSelector)).to.not.exist;
          });

          it('renders the previously deleted element', function () {
            let deletedDialExists = false;

            expect($afterClickDials.length).to.be.above(0);
            [...$afterClickDials].forEach(function (dial) {
              if (dial.querySelector(dialTitleSelector).textContent
                      === deletedTitle) {
                deletedDialExists = true;
              }
            });
            expect(deletedDialExists).to.equal(true);
          });

          it('still renders the "+" element', function () {
            expect(subject.queryAll(plusSelector).length).to.equal(1);
          });

          it('renders the previously deleted element on correct position', function () {
            expect([...$afterClickDials][0]
              .querySelector(dialTitleSelector).textContent)
              .to.equal(deletedTitle);
          });

          it('sends a "addSpeedDial" message', function () {
            expect(messages.has('addSpeedDial')).to.equal(true);
            expect(messages.get('addSpeedDial').length).to.equal(1);
          });

          it('sends a "notification > undo_delete_favorite > click" telemetry signal', function () {
            expect(messages.has('sendTelemetry')).to.equal(true);

            const telemetrySignals = messages.get('sendTelemetry');
            let count = 0;

            expect(telemetrySignals.length).to.be.above(0);

            count = telemetrySignals.filter(function (s) {
              return (
                s.args[0].type === 'home' &&
                s.args[0].view === 'notification' &&
                s.args[0].target === 'undo_delete_favorite' &&
                s.args[0].action === 'click'
              );
            }).length;

            expect(count).to.equal(1);
          });
        });
      });
    });
  });
});
