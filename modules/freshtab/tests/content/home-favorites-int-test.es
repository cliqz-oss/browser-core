import {
  clone,
  expect,
  waitFor,
} from '../../core/test-helpers';

import {
  checkTelemetry,
  defaultConfig,
  generateFavResponse,
  Subject,
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

describe('Freshtab interactions with favorites', function () {
  const dialSelector = '#section-favorites .dial:not(.dial-plus)';
  const plusBtnSelector = 'button.plus-dial-icon';
  const editBtnSelector = 'button.edit';
  const favoritesResponse = generateFavResponse();

  let $initialDials;
  let $dialToDelete;
  let subject;

  beforeEach(function () {
    subject = new Subject({
      injectTestUtils: true,
    });
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptyStats();
    subject.respondsWithEmptyNews();

    const favConfig = clone(defaultConfig);
    favConfig.response.componentsState.customDials.visible = true;
    subject.respondsWith(favConfig);
  });

  context('when favorites have just one element', function () {
    const addFormSelector = 'form.addDialForm';
    const editFormSelector = 'form.editForm';
    const urlSelector = 'form.editForm input.url';
    const titleSelector = 'form.editForm input.title';

    beforeEach(async function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: favoritesResponse[0],
      });

      await subject.load();
      $initialDials = subject.queryAll(dialSelector);
      $dialToDelete = $initialDials[0];
    });

    afterEach(function () {
      subject.unload();
    });

    describe('clicking on the element', function () {
      beforeEach(function () {
        subject.startListening();
        const logoSelector = '.logo';
        $dialToDelete.querySelector(logoSelector).click();
      });

      it('sends a "favorite > click" telemetry signal', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'favorite',
          type: 'home',
        });
      });
    });

    describe('clicking on the "+" element', function () {
      beforeEach(function () {
        subject.startListening();
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

      it('sends "home > add_favorite > click" telemetry', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'add_favorite',
          type: 'home',
        });
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

        it('sends a "home > add_favorite > close > click" telemetry', function () {
          checkTelemetry({
            action: 'click',
            subject: () => subject,
            target: 'close',
            type: 'home',
            view: 'add_favorite',
          });
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

        subject.startListening();
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

      it('sends a "home > add_favorite > click" telemetry signal', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'add_favorite',
          type: 'home',
        });
      });

      it('sends a "home > add_favorite > add > click" telemetry signal', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'add',
          type: 'home',
          view: 'add_favorite',
        });
      });
    });

    describe('clicking on the "pencil" edit icon', function () {
      beforeEach(function () {
        subject.startListening();
        subject.query(editBtnSelector).click();
        return waitFor(() => (subject.query(editFormSelector)));
      });

      it('renders an "Edit favorite" form', function () {
        expect(subject.getComputedStyle(subject.query(editFormSelector).parentNode).display)
          .to.not.contain('none');
      });

      it('sends "home > edit_favorite > click" telemetry', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'edit_favorite',
          type: 'home',
        });
      });

      describe("then clicking on the edit form's delete button", function () {
        beforeEach(function () {
          subject.query('button.deleteDial').click();
          return waitFor(() => expect(subject.query('.modal')).to.be.null);
        });

        it('does not render the "Edit a favorite" form anymore', function () {
          expect(subject.query(editFormSelector)).to.be.null;
        });

        it('sends a "edit_favorite > delete > click" telemetry signal', function () {
          checkTelemetry({
            action: 'click',
            subject: () => subject,
            target: 'delete',
            type: 'home',
            view: 'edit_favorite',
          });
        });
      });

      describe("then clicking on the edit form's close button", function () {
        beforeEach(function () {
          subject.query('button.closeForm').click();
          return waitFor(() => expect(subject.query('.modal')).to.be.null);
        });

        it('does not render the "Edit a favorite" form anymore', function () {
          expect(subject.query(editFormSelector)).to.be.null;
        });

        it('sends a "edit_favorite > close > click" telemetry signal', function () {
          checkTelemetry({
            action: 'click',
            subject: () => subject,
            target: 'close',
            type: 'home',
            view: 'edit_favorite',
          });
        });
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

        subject.startListening();
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
        expect(subject.queryAll('#section-favorites .dial')[0].href).to.equal(editedDial.url);
        expect(subject.queryAll('#section-favorites .dial')[0].querySelector('.title'))
          .to.contain.text(editedDial.displayTitle);
      });

      it('sends "home > edit_favorite > click" telemetry', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'edit_favorite',
          type: 'home',
        });
      });

      it('sends a "edit_favorite > save > click" telemetry', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'save',
          type: 'home',
          view: 'edit_favorite',
        });
      });
    });
  });
});
