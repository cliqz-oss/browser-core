import {
  clone,
  clearIntervals,
  waitFor,
  Subject,
  defaultConfig,
} from './helpers';

const favoritesDial = i => ({
  title: `https://this${i}.test.title`,
  id: `this${i}.test.id`,
  url: `https://this${i}.test.domain`,
  displayTitle: `t0${i}`,
  custom: true,
  logo: {
    text: `0${i}`,
    backgroundColor: 'c3043e',
    buttonsClass: 'cliqz-brands-button-1',
    style: 'background-color: #c3043e;color:#fff;'
  }
});

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
  const favoritesDialSelector = '#section-favorites div.dial:not(.dial-plus)';
  const favoritesPlusSelector = '#section-favorites div.dial-plus';
  const favoritesPlusBtnSelector = 'button.plus-dial-icon';
  const favoritesDialTitleSelector = 'div.title';
  const favoritesDeleteBtnSelector = 'button.delete';
  const undoBoxSelector = 'div.undo-notification-box';
  const favoritesAreaSelector = '#section-favorites';

  let favoritesInitialDialItems;
  let favoritesDialToDelete;
  let favoritesDeletedTitle;
  let favoritesDeletedBtn;
  let favoritesAfterClickDialItems;

  const favoritesResponse = [
    {
      history: [],
      custom: [0].map(favoritesDial)
    },

    {
      history: [],
      custom: [0, 1, 2, 3, 4, 5].map(favoritesDial)
    },
  ];
  let subject;
  let messages;
  let listener;

  beforeEach(function () {
    subject = new Subject();
    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: []
      }
    });

    const favConfig = clone(defaultConfig);
    favConfig.response.componentsState.customDials.visible = true;
    subject.respondsWith(favConfig);
  });

  afterEach(function () {
    clearIntervals();
  });

  context('when favorites have just one element', function () {
    const addFormSelector = 'form.addDialForm';

    beforeEach(function () {
        subject.respondsWith({
          module: 'freshtab',
          action: 'getSpeedDials',
          response: favoritesResponse[0],
        });

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
        favoritesInitialDialItems = subject.queryAll(favoritesDialSelector);
        favoritesDialToDelete = favoritesInitialDialItems[0];
      });
    });

    afterEach(function () {
      subject.chrome.runtime.onMessage.removeListener(listener);
      subject.unload();
    });

    describe('clicking on the element', function () {
      beforeEach(function () {
        const logoSelector = 'div.logo';
        favoritesDialToDelete.querySelector(logoSelector).click();
      });

      it('sends a "favorite > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].target === 'favorite') &&
              (item.args[0].action === 'click') &&
              (item.args[0].index === 0)) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on the "+" element', function () {
      beforeEach(function () {
        subject.query(favoritesPlusBtnSelector).click();
        return waitFor(() => (subject.query(addFormSelector)));
      });

      it('renders an "Add a favorite" form', function () {
        chai.expect(getComputedStyle(subject.query(addFormSelector).parentNode).display)
          .to.not.contain('none');
      });

      it('renders an "Add a favorite" form in a correct position', function () {
        chai.expect(subject.queryAll('#section-favorites div.dial')[1]
          .contains(subject.query(addFormSelector))).to.be.true;
      });

      it('does not render the "+" button anymore', function () {
        chai.expect(getComputedStyle(subject.query(favoritesPlusBtnSelector).parentNode).display)
          .to.contain('none');
      });

      it('sends a "add_favorite > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].target === 'add_favorite') &&
              (item.args[0].action === 'click')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });

      describe("then clicking on the form's close button", function () {
        beforeEach(function () {
          subject.query('button.hideAddForm').click();
          return waitFor(() => subject.query(addFormSelector).parentNode.style.display === 'none');
        });

        it('renders a "+" button', function () {
          chai.expect(getComputedStyle(subject.query(favoritesPlusBtnSelector).parentNode).display)
            .to.not.contain('none');
        });

        it('does not render the "Add a favorite" form anymore', function () {
          chai.expect(getComputedStyle(subject.query(addFormSelector).parentNode).display)
            .to.contain('none');
        });

        it('sends a "add_favorite > close > click" telemetry signal', function () {
          chai.expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].view === 'add_favorite') &&
                (item.args[0].target === 'close') &&
                (item.args[0].action === 'click')) {
                  signalExist = true;
                  count += 1;
            }
          });

          chai.expect(signalExist).to.be.true;
          chai.expect(count).to.equal(1);
        });
      });
    });

    describe('simulating adding a new favorite element', function () {
      beforeEach(function () {
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

        const addButton = subject.query(favoritesPlusBtnSelector);
        addButton.click();
        return waitFor(() => subject.query(addFormSelector).parentElement.style.display !== 'none')
          .then(() => {
            subject.query('form.addDialForm input.addUrl').value = 'aaaa';
            subject.query('form.addDialForm button.submit').click();
          });
      });

      it('renders a new favorite in the list', function () {
        chai.expect(subject.queryAll('#section-favorites div.dial:not(.dial-plus)').length)
          .to.equal(2);
        chai.expect(subject.queryAll('#section-favorites div.dial')[1]
          .querySelector('div.title')).to.contain.text(amazonDial.displayTitle);
      });

      it('renders the "+" button as the last element', function () {
        const allDialsSelector = '#section-favorites div.dial';
        const allDialsItems = subject.queryAll(allDialsSelector);
        chai.expect(allDialsItems.length).to.equal(3);
        chai.expect(allDialsItems[2].className).to.contain('dial-plus');
      });

      it('sends a "add_favorite > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].target === 'add_favorite') &&
              (item.args[0].action === 'click')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });

      it('sends a "add_favorite > add > click" telemetry signal', function () {
        chai.expect(messages.has('sendTelemetry')).to.equal(true);

        const telemetrySignals = messages.get('sendTelemetry');
        let signalExist = false;
        let count = 0;

        telemetrySignals.forEach(function (item) {
          if ((item.args[0].type === 'home') &&
              (item.args[0].view === 'add_favorite') &&
              (item.args[0].target === 'add') &&
              (item.args[0].action === 'click')) {
                signalExist = true;
                count += 1;
          }
        });

        chai.expect(signalExist).to.be.true;
        chai.expect(count).to.equal(1);
      });
    });

    describe('clicking on a delete button of the element', function () {
      beforeEach(function () {
        favoritesDeletedTitle = favoritesDialToDelete
          .querySelector(favoritesDialTitleSelector).textContent;
        favoritesDeletedBtn = favoritesDialToDelete.querySelector(favoritesDeleteBtnSelector);
        favoritesDeletedBtn.click();
        return waitFor(() => (subject.query(undoBoxSelector)));
      });

      afterEach(function () {
        subject.chrome.runtime.onMessage.removeListener(listener);
      });

      describe('of the first element', function () {
        it('removes the element', function () {
          chai.expect(favoritesDeletedTitle).to.equal(favoritesResponse[0].custom[0].displayTitle);
        });

        it('does not render any favorites elements', function () {
          chai.expect(subject.queryAll(favoritesDialSelector).length).to.equal(0);
        });

        it('renders only the "+" element', function () {
          chai.expect(subject.queryAll(favoritesPlusSelector).length).to.equal(1);
        });

        it('renders a popup with undo message', function () {
          chai.expect(subject.query(undoBoxSelector)).to.exist;
        });

        it('still renders the most visited area', function () {
          chai.expect(subject.query(favoritesAreaSelector)).to.exist;
        });

        it('sends a "removeSpeedDial" message', function () {
          chai.expect(messages.has('removeSpeedDial')).to.equal(true);
          chai.expect(messages.get('removeSpeedDial').length).to.equal(1);
        });

        it('sends a "delete_favorite > click" telemetry signal', function () {
          chai.expect(messages.has('sendTelemetry')).to.equal(true);

          const telemetrySignals = messages.get('sendTelemetry');
          let signalExist = false;
          let count = 0;

          telemetrySignals.forEach(function (item) {
            if ((item.args[0].type === 'home') &&
                (item.args[0].target === 'delete_favorite') &&
                (item.args[0].action === 'click') &&
                (item.args[0].index === 0)) {
                  signalExist = true;
                  count += 1;
            }
          });

          chai.expect(signalExist).to.be.true;
          chai.expect(count).to.equal(1);
        });

        describe('then clicking on a close button of the undo popup', function () {
          const undoPopupCloseBtnSelector = 'div.undo-notification-box button.close';

          beforeEach(function () {
            subject.query(undoPopupCloseBtnSelector).click();
            return waitFor(() => !(subject.query(undoBoxSelector))).then(() => {
              favoritesAfterClickDialItems = subject.queryAll(favoritesDialSelector);
            });
          });

          it('removes the popup', function () {
            chai.expect(subject.query(undoBoxSelector)).to.not.exist;
          });

          it('still does not render any favorites elements', function () {
            chai.expect(favoritesAfterClickDialItems.length).to.equal(0);
          });

          it('still renders the "+" element', function () {
            chai.expect(subject.queryAll(favoritesPlusSelector).length).to.equal(1);
          });

          it('sends a "notification > close > click" telemetry signal', function () {
            chai.expect(messages.has('sendTelemetry')).to.equal(true);

            const telemetrySignals = messages.get('sendTelemetry');
            let signalExist = false;
            let count = 0;

            telemetrySignals.forEach(function (item) {
              if ((item.args[0].type === 'home') &&
                  (item.args[0].view === 'notification') &&
                  (item.args[0].target === 'close') &&
                  (item.args[0].action === 'click')) {
                    signalExist = true;
                    count += 1;
              }
            });

            chai.expect(signalExist).to.be.true;
            chai.expect(count).to.equal(1);
          });
        });

        describe('then clicking on an undo button of the undo popup', function () {
          const undoPopupUndoBtnSelector = 'div.undo-notification-box button.undo';

          beforeEach(function () {
            subject.query(undoPopupUndoBtnSelector).click();
            return waitFor(() => !(subject.query(undoBoxSelector))).then(() => {
              favoritesAfterClickDialItems = subject.queryAll(favoritesDialSelector);
            });
          });

          it('removes the popup', function () {
            chai.expect(subject.query(undoBoxSelector)).to.not.exist;
          });

          it('renders the previously deleted element', function () {
            let deletedDialExists = false;

            [...favoritesAfterClickDialItems].forEach(function (dial) {
              if (dial.querySelector(favoritesDialTitleSelector).textContent
                      === favoritesDeletedTitle) {
                deletedDialExists = true;
              }
            });
            chai.expect(deletedDialExists).to.equal(true);
          });

          it('still renders the "+" element', function () {
            chai.expect(subject.queryAll(favoritesPlusSelector).length).to.equal(1);
          });

          it('renders the previously deleted element on correct position', function () {
            chai.expect([...favoritesAfterClickDialItems][0]
              .querySelector(favoritesDialTitleSelector).textContent)
              .to.equal(favoritesDeletedTitle);
          });

          it('sends a "addSpeedDial" message', function () {
            chai.expect(messages.has('addSpeedDial')).to.equal(true);
            chai.expect(messages.get('addSpeedDial').length).to.equal(1);
          });

          it('sends a "notification > undo_delete_favorite > click" telemetry signal', function () {
            chai.expect(messages.has('sendTelemetry')).to.equal(true);

            const telemetrySignals = messages.get('sendTelemetry');
            let signalExist = false;
            let count = 0;

            telemetrySignals.forEach(function (item) {
              if ((item.args[0].type === 'home') &&
                  (item.args[0].view === 'notification') &&
                  (item.args[0].target === 'undo_delete_favorite') &&
                  (item.args[0].action === 'click')) {
                    signalExist = true;
                    count += 1;
              }
            });
            chai.expect(signalExist).to.be.true;
            chai.expect(count).to.equal(1);
          });
        });
      });
    });
  });
});
