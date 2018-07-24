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

const editedDial = {
  title: 'https://2.test.title/',
  id: '2.test.id/',
  url: 'https://2.test.domain/',
  displayTitle: 't02',
  custom: true,
  logo: {
    text: '02',
    backgroundColor: 'c3043e',
    buttonsClass: 'cliqz-brands-button-1',
    style: 'background-color: #ccc;color:#fff;'
  }
};

describe('Fresh tab interactions with favorites', function () {
  const dialSelector = '#section-favorites .dial:not(.dial-plus)';
  const plusSelector = '#section-favorites .dial-plus';
  const plusBtnSelector = 'button.plus-dial-icon';
  const dialTitleSelector = '.title';
  const editBtnSelector = 'button.edit';
  const closeFormSelector = 'button.closeForm';
  const deleteBtnSelector = '.deleteBox';
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
    subject = new Subject({
      injectTestUtils: true,
    });
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
    const editBtnSelector = '#section-favorites button.edit';
    const editFormSelector = 'form.editForm';
    const urlSelector ='form.editForm input.url';
    const titleSelector = 'form.editForm input.title';
    const placeholderSelector = 'form.editForm label';

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

      it('still renders the "+" button', function () {
        expect(subject.getComputedStyle(subject.query(plusBtnSelector).parentNode).display)
          .to.not.contain('none');
      });

      it('does not send telemetry', function () {
        expect(messages.has('sendTelemetry')).to.equal(false);
      });

      describe("then clicking on the form's close button", function () {
        beforeEach(function () {
          subject.query('button.closeForm').click();
          return waitFor(() => expect(subject.query('.modal')).to.be.null);
        });

        it('renders a "+" button', function () {
          expect(subject.getComputedStyle(subject
            .query(plusBtnSelector).parentNode).display)
            .to.not.contain('none');
        });

        it('does not render the "Add a favorite" form anymore', function () {
          expect(subject.query(addFormSelector)).to.be.null;
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
        subject.testUtils.Simulate.click(addButton);
        await waitFor(() => expect(subject.query(addFormSelector)).to.exist);
        const input = subject.query('form.addDialForm input.addUrl');
        input.value = 'aaaa';
        subject.testUtils.Simulate.change(input);
        subject.query('form.addDialForm button.submit').click();
      });

      it('renders a new favorite in the list', function () {
        expect(subject.queryAll('#section-favorites .dial:not(.dial-plus)').length)
          .to.equal(2);
        expect(subject.queryAll('#section-favorites .dial')[1].href)
          .to.equal(amazonDial.url);
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

    describe('simulating editing the favorite', function () {
      beforeEach(async function () {
        subject.respondsWith({
          module: 'freshtab',
          action: 'getSpeedDials',
          response: favoritesResponse[0],
        });

        subject.respondsWith({
          module: 'freshtab',
          action: 'editSpeedDial',
          response: editedDial,
        });

        const editButton = subject.query(editBtnSelector);
        subject.testUtils.Simulate.click(editButton);
        await waitFor(() => expect(subject.query(editFormSelector)).to.exist);
        const urlInput = subject.query(urlSelector);
        const titleInput = subject.query(titleSelector);

        urlInput.value = editedDial.url;
        titleInput.value = editedDial.displayTitle;

        subject.testUtils.Simulate.change(editedDial.url);
        subject.testUtils.Simulate.change(editedDial.displayTitle);
        subject.query('form.editForm button.submit').click();
      });

      it('renders the edited favorite in the list', function () {
        expect(subject.queryAll('#section-favorites .dial:not(.dial-plus)').length)
          .to.equal(1);
        console.log(subject.queryAll('#section-favorites .dial')[0]);
        expect(subject.queryAll('#section-favorites .dial')[0].href).to.equal(editedDial.url);
        expect(subject.queryAll('#section-favorites .dial')[0].querySelector('.title'))
          .to.contain.text(editedDial.displayTitle);
      });
    });
  });
});
