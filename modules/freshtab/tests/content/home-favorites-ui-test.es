import {
  clearIntervals,
  clone,
  defaultConfig,
  expect,
  Subject,
  waitFor
} from './helpers';

const favoritesDial = i => ({
  title: `https://this${i}.test.title`,
  id: `this${i}.test.id`,
  url: `https://this${i}.test.domain`,
  displayTitle: `t0${i}`,
  custom: false,
  logo: {
    text: `0${i}`,
    backgroundColor: 'c3043e',
    buttonsClass: 'cliqz-brands-button-1',
    style: 'background-color: #c3043e;color:#fff;'
  }
});

describe('Fresh tab favorites UI', function () {
  const favoritesAreaSelector = '#section-favorites';
  const favoritesHeaderSelector = '#section-favorites div.dial-header';
  const favoritesItemSelector = '#section-favorites div.dial:not(.dial-plus)';
  const favoritesPlusSelector = '#section-favorites div.dial-plus';
  const favoritesResponse = [
    {
      history: [],
      custom: [0].map(favoritesDial)
    },

    {
      history: [],
      custom: [0, 1].map(favoritesDial)
    },

    {
      history: [],
      custom: [0, 1, 2].map(favoritesDial)
    },

    {
      history: [],
      custom: [0, 1, 2, 3].map(favoritesDial)
    },

    {
      history: [],
      custom: [0, 1, 2, 3, 4].map(favoritesDial)
    },

    {
      history: [],
      custom: [0, 1, 2, 3, 4, 5].map(favoritesDial)
    },

    {
      history: [],
      custom: [0, 1, 2, 3, 4, 5, 6].map(favoritesDial)
    },
  ];
  let subject;
  let favConfig;

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

    favConfig = clone(defaultConfig);
    favConfig.response.componentsState.customDials.visible = true;
  });

  afterEach(function () {
    clearIntervals();
  });

  describe('renders area', function () {
    const settingsRowSelector = '#settings-panel div.settings-row';
    const settingsSwitchSelector = 'div.switch-container input.switch';

    context('when set to be visible', function () {
      beforeEach(function () {
        subject.respondsWith({
          module: 'freshtab',
          action: 'getSpeedDials',
          response: favoritesResponse[0],
        });
        subject.respondsWith(favConfig);
        return subject.load();
      });

      afterEach(function () {
        subject.unload();
      });

      it('with the visibility switch turned on', function () {
        const allSettingsRows = subject.queryAll(settingsRowSelector);
        expect(allSettingsRows[4].querySelector(settingsSwitchSelector))
          .to.have.property('checked', true);
      });

      it('with visible dials', function () {
        expect(subject.query(favoritesAreaSelector)).to.exist;
      });
    });

    context('when set to not be visible', function () {
      beforeEach(function () {
        subject.respondsWith({
          module: 'freshtab',
          action: 'getSpeedDials',
          response: favoritesResponse[0],
        });
        subject.respondsWith(defaultConfig);
        return subject.load();
      });

      afterEach(function () {
        subject.unload();
      });

      it('with the visibility switch turned off', function () {
        const allSettingsRows = subject.queryAll(settingsRowSelector);
        expect(allSettingsRows[4].querySelector(settingsSwitchSelector))
          .to.have.property('checked', false);
      });

      it('with no visible dials', function () {
        expect(subject.query(favoritesAreaSelector)).to.not.exist;
      });
    });
  });

  context('when a "+" button has been clicked', function () {
    const favoritesPlusBtnSelector = 'button.plus-dial-icon';
    const addFormSelector = 'form.addDialForm';

    beforeEach(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: favoritesResponse[0],
      });
      subject.respondsWith(favConfig);
      return subject.load().then(() => {
        subject.query(favoritesPlusBtnSelector).click();
        return waitFor(() => (subject.query(addFormSelector)));
      });
    });

    afterEach(function () {
      subject.unload();
    });

    describe('renders add form', function () {
      it('successfully', function () {
        expect(subject.query('#section-favorites form.addDialForm')).to.exist;
      });

      it('with an existing close button', function () {
        expect(subject.query('#section-favorites button.hideAddForm')).to.exist;
      });

      it('with an existing URL field', function () {
        expect(subject.query('#section-favorites input.addUrl')).to.exist;
      });

      it('with an URL field with correct placeholder', function () {
        expect(subject.query('#section-favorites input.addUrl').placeholder)
          .to.equal('freshtab.app.speed-dial.input.placeholder');
      });

      it('with an existing CTA button', function () {
        expect(subject.query('#section-favorites button.submit')).to.exist;
      });

      it('with a CTA button with correct label', function () {
        expect(subject.query('#section-favorites button.submit'))
          .to.have.text('freshtab.app.speed-dial.add');
      });
    });
  });

  context('when a tile has been deleted', function () {
    const favoritesDeleteSelector = '#section-favorites div.dial button.delete';
    const undoBoxSelector = 'div.undo-notification-box';

    beforeEach(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: favoritesResponse[0],
      });
      subject.respondsWith(favConfig);
      return subject.load().then(() => {
        subject.query(favoritesDeleteSelector).click();
        return waitFor(() => subject.query(undoBoxSelector));
      });
    });

    afterEach(function () {
      subject.unload();
    });

    describe('renders undo popup message', function () {
      it('successfully', function () {
        expect(subject.query(undoBoxSelector)).to.exist;
      });

      it('with a delete button', function () {
        const undoBoxDeleteBtnSelector = 'div.undo-notification-box button.close';
        expect(subject.query(undoBoxDeleteBtnSelector)).to.exist;
      });

      it('with an undo button', function () {
        const undoBoxUndoBtnSelector = 'div.undo-notification-box button.undo';
        expect(subject.query(undoBoxUndoBtnSelector)).to.exist;
      });

      it('with existing and correct message text', function () {
        expect(subject.query(undoBoxSelector))
          .to.contain.text(favoritesResponse[0].custom[0].displayTitle);
        expect(subject.query(undoBoxSelector))
          .to.contain.text('freshtab.app.speed-dial.removed');
      });
    });
  });

  describe('generated results', function () {
    [0, 1, 2, 3, 4, 5, 6].forEach(function (i) {
      context(`with ${i + 1} elements`, function () {
        let amountFavoritesFromData;
        let favoritesTiles;

        beforeEach(function () {
          subject.respondsWith({
            module: 'freshtab',
            action: 'getSpeedDials',
            response: favoritesResponse[i],
          });
          subject.respondsWith(favConfig);
          return subject.load().then(() => {
            amountFavoritesFromData = favoritesResponse[i].custom.length;
            favoritesTiles = subject.queryAll(favoritesItemSelector);
          });
        });

        afterEach(function () {
          subject.unload();
        });

        describe('renders area', function () {
          it('with an existing label', function () {
            expect(subject.query(favoritesHeaderSelector)).to.exist;
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
              expect(subject.query(favoritesPlusSelector)).to.exist;
              expect(subject.getComputedStyle(subject.query(favoritesPlusSelector)).display)
                .to.not.equal('none');
            });
          } else {
            it('is not rendered when the row is full', function () {
              expect(subject.query(favoritesPlusSelector)).to.not.exist;
            });
          }
        });

        describe('renders each element', function () {
          const favoritesLogoSelector = '#section-favorites div.dial div.logo';
          let favoritesItemsLogos;

          beforeEach(function () {
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
            const favoritesItemsDials = subject.queryAll(favoritesItemSelector);

            expect(favoritesItemsDials.length).to.be.above(0);
            [...favoritesItemsDials].forEach(function (item, j) {
              expect(item.title).to.exist;
              expect(item.title).to.equal(favoritesResponse[i].custom[j].url);
            });
          });

          it('with existing and correct links', function () {
            const favoritesLinkSelector = '#section-favorites div.dial a';
            const favoritesItemsLinks = subject.queryAll(favoritesLinkSelector);

            expect(favoritesItemsLinks.length).to.be.above(0);
            [...favoritesItemsLinks].forEach(function (item, j) {
              expect(item.href).to.exist;
              expect(item.href).to.contain(favoritesResponse[i].custom[j].url);
            });
          });

          it('with existing and correct descriptions', function () {
            const favoritesDescriptionSelector = '#section-favorites div.dial div.title';
            const favoritesItemsDesc = subject.queryAll(favoritesDescriptionSelector);

            expect(favoritesItemsDesc.length).to.be.above(0);
            [...favoritesItemsDesc].forEach(function (item, j) {
              expect(item).to.have.text(favoritesResponse[i].custom[j].displayTitle);
            });
          });

          it('with existing delete buttons', function () {
            const favoritesDeleteSeletor = '#section-favorites div.dial button.delete';
            const favoritesItemsButton = subject.queryAll(favoritesDeleteSeletor);
            expect(favoritesItemsButton.length).to.be.above(0);
          });
        });
      });
    });
  });
});
