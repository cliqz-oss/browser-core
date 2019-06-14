import {
  clone,
  expect,
  waitFor,
} from '../../core/test-helpers';
import {
  defaultConfig,
  generateFavResponse,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab favorites UI', function () {
  const favoritesAreaSelector = '#section-favorites';
  const headerSelector = '#section-favorites .dial-header';
  const dialSelector = '#section-favorites .dial:not(.dial-plus)';
  const plusSelector = '#section-favorites .dial-plus';
  const favoritesResponse = generateFavResponse();
  let subject;
  let favConfig;

  before(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptyNews();
    subject.respondsWithEmptyStats();

    favConfig = clone(defaultConfig);
    favConfig.response.componentsState.customDials.visible = true;
  });

  describe('renders area', function () {
    before(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: favoritesResponse[0],
      });
    });

    context('when set to be visible', function () {
      before(async function () {
        subject.respondsWith(favConfig);
        await subject.load();
        return subject.query('#settings-btn').click();
      });

      after(function () {
        subject.unload();
      });

      it('with the visibility switch turned on', function () {
        const $favoritesSwitch = subject.queryByI18n('freshtab_app_settings_favorites_label')
          .querySelector('input.switch');
        expect($favoritesSwitch).to.have.property('checked', true);
      });

      it('with visible dials', function () {
        expect(subject.query(favoritesAreaSelector)).to.exist;
      });
    });

    context('when set to not be visible', function () {
      before(async function () {
        subject.respondsWith(defaultConfig);
        await subject.load();
        return subject.query('#settings-btn').click();
      });

      after(function () {
        subject.unload();
      });

      it('with the visibility switch turned off', function () {
        const $favoritesSwitch = subject.queryByI18n('freshtab_app_settings_favorites_label')
          .querySelector('input.switch');
        expect($favoritesSwitch).to.have.property('checked', false);
      });

      it('with no visible dials', function () {
        expect(subject.query(favoritesAreaSelector)).to.not.exist;
      });
    });
  });

  context('when a "+" button has been clicked', function () {
    const favoritesPlusBtnSelector = 'button.plus-dial-icon';
    const addFormSelector = 'form.addDialForm';
    const formClose = 'form.addDialForm button.closeForm';
    const urlSelector = 'form.addDialForm input.addUrl';
    const titleSelector = 'form.addDialForm input.title';
    const placeholderSelector = 'form.addDialForm label';

    before(async function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: favoritesResponse[0],
      });

      subject.respondsWith(favConfig);
      await subject.load();
      subject.query(favoritesPlusBtnSelector).click();
      return waitFor(() => (subject.query(addFormSelector)));
    });

    after(function () {
      subject.unload();
    });

    describe('renders add form', function () {
      it('successfully', function () {
        expect(subject.getComputedStyle(subject.query(addFormSelector).parentNode).display)
          .to.not.contain('none');
      });

      it('with an existing close button', function () {
        expect(subject.getComputedStyle(subject.query(formClose)).display)
          .to.not.contain('none');
      });

      it('with an existing URL field', function () {
        expect(subject.query(urlSelector)).to.exist;
      });

      it('with an existing title field', function () {
        expect(subject.query(titleSelector)).to.exist;
      });

      it('with URL and title fields with correct placeholder', function () {
        const placeholderList = subject.queryAll(placeholderSelector);
        expect(placeholderList[0].htmlFor).to.equal('url');
        expect(placeholderList[0]).to.have.text('freshtab_app_speed_dial_input_address_placeholder');
        expect(placeholderList[1].htmlFor).to.equal('title');
        expect(placeholderList[1]).to.have.text('freshtab_app_speed_dial_input_title_placeholder');
      });

      it('with an existing CTA button', function () {
        expect(subject.query('form.addDialForm button.submit')).to.exist;
      });

      it('with a CTA button with correct label', function () {
        expect(subject.query('form.addDialForm button.submit'))
          .to.have.text('freshtab_app_speed_dial_add'.toUpperCase());
      });
    });

    it('does not render undo popup', function () {
      expect(subject.query('.undo-notification-box')).to.not.have.class('visible');
    });
  });

  context('when the edit button is clicked', function () {
    const editFormSelector = 'form.editForm';
    const editBtnSelector = '#section-favorites button.edit';
    const editFormSubmitBtn = 'form.editForm button.submit';
    const urlSelector = 'form.editForm input.url';
    const titleSelector = 'form.editForm input.title';
    const placeholderSelector = 'form.editForm label';
    const formClose = 'form.editForm button.closeForm';

    before(async function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: favoritesResponse[0],
      });
      subject.respondsWith(favConfig);
      await subject.load();
      subject.query(editBtnSelector).click();
      return waitFor(() => subject.query(editFormSelector));
    });

    after(function () {
      subject.unload();
    });

    describe('renders edit form', function () {
      it('successfully', function () {
        expect(subject.query(editFormSelector)).to.exist;
      });

      it('with an existing close button', function () {
        expect(subject.getComputedStyle(subject.query(formClose)).display)
          .to.not.contain('none');
      });

      it('with an existing URL field', function () {
        expect(subject.query(urlSelector)).to.exist;
      });

      it('with an existing title field', function () {
        expect(subject.query(titleSelector)).to.exist;
      });

      it('with URL and title fields with correct placeholder', function () {
        const placeholderList = subject.queryAll(placeholderSelector);
        expect(placeholderList[0].htmlFor).to.equal('url');
        expect(placeholderList[0]).to.have.text('freshtab_app_speed_dial_edit_address_header');
        expect(placeholderList[1].htmlFor).to.equal('title');
        expect(placeholderList[1]).to.have.text('freshtab_app_speed_dial_edit_title_header');
      });

      it('with an existing CTA button', function () {
        expect(subject.query(editFormSubmitBtn)).to.exist;
      });

      it('with a CTA button with correct label', function () {
        expect(subject.query(editFormSubmitBtn))
          .to.have.text('freshtab_app_speed_dial_save'.toUpperCase());
      });

      it('with existing and correct url and title field values', function () {
        expect(subject.query(urlSelector).value)
          .to.equal(favoritesResponse[0].custom[0].url);
        expect(subject.query(titleSelector).value)
          .to.equal(favoritesResponse[0].custom[0].displayTitle);
      });
    });

    it('does not render undo popup', function () {
      expect(subject.query('.undo-notification-box')).to.not.have.class('visible');
    });
  });

  context('when the edit button is clicked to delete dial', function () {
    const editFormSelector = 'form.editForm';
    const editBtnSelector = '#section-favorites button.edit';
    const favoritesDeleteSelector = 'form.editForm .deleteDial';
    const undoBoxSelector = '.undo-notification-box';

    before(async function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: favoritesResponse[0],
      });
      subject.respondsWith(favConfig);
      await subject.load();
      subject.query(editBtnSelector).click();
      await waitFor(() => subject.query(editFormSelector));
      subject.query(favoritesDeleteSelector).click();
      return waitFor(() => subject.query(undoBoxSelector));
    });

    after(function () {
      subject.unload();
    });

    describe('renders undo popup message', function () {
      it('successfully', function () {
        expect(subject.query('.undo-notification-box')).to.have.class('visible');
      });

      it('with a delete button', function () {
        const undoBoxDeleteBtnSelector = '.undo-notification-box button.close';
        expect(subject.query(undoBoxDeleteBtnSelector)).to.exist;
      });

      it('with an undo button', function () {
        const undoBoxUndoBtnSelector = '.undo-notification-box button.undo';
        expect(subject.query(undoBoxUndoBtnSelector)).to.exist;
      });

      it('with existing and correct message text', function () {
        expect(subject.query(undoBoxSelector))
          .to.contain.text(favoritesResponse[0].custom[0].displayTitle);
        expect(subject.query(undoBoxSelector))
          .to.contain.text('freshtab_app_speed_dial_removed');
      });
    });
  });

  describe('generated results', function () {
    [0, 1, 2, 3, 4, 5, 6].forEach(function (i) {
      context(`with ${i + 1} elements`, function () {
        let amountFavoritesFromData;
        let favoritesTiles;

        before(async function () {
          subject.respondsWith({
            module: 'freshtab',
            action: 'getSpeedDials',
            response: favoritesResponse[i],
          });
          subject.respondsWith(favConfig);
          await subject.load();
          amountFavoritesFromData = favoritesResponse[i].custom.length;
          favoritesTiles = subject.queryAll(dialSelector);
        });

        after(function () {
          subject.unload();
        });

        describe('renders area', function () {
          it('with an existing label', function () {
            expect(subject.query(headerSelector)).to.exist;
          });

          it('with a correct amount of favorites', function () {
            if (i <= 5) {
              expect(favoritesTiles.length)
                .to.equal(amountFavoritesFromData)
                .and.to.be.below(7);
            } else {
              expect(favoritesTiles.length)
                .to.equal(amountFavoritesFromData - 1)
                .and.to.be.below(7);
            }
          });
        });

        describe('add icon', function () {
          if (i <= 4) {
            it('is rendered when the row is not full', function () {
              expect(subject.query(plusSelector)).to.exist;
              expect(subject.getComputedStyle(subject.query(plusSelector)).display)
                .to.not.equal('none');
            });
          } else {
            it('is not rendered when the row is full', function () {
              expect(subject.query(plusSelector)).to.not.exist;
            });
          }
        });

        describe('renders each element', function () {
          const favoritesLogoSelector = '#section-favorites .dial .logo';
          let favoritesItemsLogos;

          before(function () {
            favoritesItemsLogos = subject.queryAll(favoritesLogoSelector);
          });

          it('with existing square logos with correct background color', function () {
            expect(favoritesItemsLogos.length).to.be.above(0);
            [...favoritesItemsLogos].forEach(function (item) {
              expect(subject.getComputedStyle(item).background)
                .to.contain('rgb(195, 4, 62)');
            });
          });

          it('with existing and correct two chars on logos', function () {
            expect(favoritesItemsLogos.length).to.be.above(0);
            [...favoritesItemsLogos].forEach(function (item, j) {
              expect(item.textContent).to.exist;
              expect(item.textContent.length).to.equal(2);
              expect(item).to.have.text(favoritesResponse[i].custom[j].logo.text);
            });
          });

          it('with existing and correct link titles', function () {
            const favoritesItemsDials = subject.queryAll(dialSelector);

            expect(favoritesItemsDials.length).to.be.above(0);
            [...favoritesItemsDials].forEach(function (item, j) {
              expect(item.title).to.exist;
              expect(item.title).to.equal(favoritesResponse[i].custom[j].displayTitle);
            });
          });

          it('with existing and correct links', function () {
            const favoritesLinkSelector = '#section-favorites a.dial';
            const favoritesItemsLinks = subject.queryAll(favoritesLinkSelector);

            expect(favoritesItemsLinks.length).to.be.above(0);
            [...favoritesItemsLinks].forEach(function (item, j) {
              expect(item.href).to.exist;
              expect(item.href).to.contain(favoritesResponse[i].custom[j].url);
            });
          });

          it('with existing and correct descriptions', function () {
            const favoritesDescriptionSelector = '#section-favorites .dial .title';
            const favoritesItemsDesc = subject.queryAll(favoritesDescriptionSelector);

            expect(favoritesItemsDesc.length).to.be.above(0);
            [...favoritesItemsDesc].forEach(function (item, j) {
              expect(item).to.have.text(favoritesResponse[i].custom[j].displayTitle);
            });
          });

          it('with existing edit buttons', function () {
            const favoritesDeleteSeletor = '#section-favorites .dial button.edit';
            const favoritesItemsButton = subject.queryAll(favoritesDeleteSeletor);
            expect(favoritesItemsButton.length).to.be.above(0);
          });
        });
      });
    });
  });
});
