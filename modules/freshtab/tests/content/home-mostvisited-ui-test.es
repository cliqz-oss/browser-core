import {
  clearIntervals,
  clone,
  defaultConfig,
  expect,
  Subject,
  waitFor
} from './helpers';

const historyDial = i => ({
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

describe('Fresh tab most visited UI', function () {
  const mostVisitedAreaSelector = '#section-most-visited';
  const mostVisitedHeaderSelector = '#section-most-visited div.dial-header';
  const mostVisitedItemSelector = '#section-most-visited div.dial';
  const restoreOptionSelector = '#settings-panel button.link';
  const historyResponse = [
    {
      history: [0].map(historyDial),
      custom: []
    },

    {
      history: [0, 1].map(historyDial),
      custom: []
    },

    {
      history: [0, 1, 2].map(historyDial),
      custom: []
    },

    {
      history: [0, 1, 2, 3].map(historyDial),
      custom: []
    },

    {
      history: [0, 1, 2, 3, 4].map(historyDial),
      custom: []
    },

    {
      history: [0, 1, 2, 3, 4, 5].map(historyDial),
      custom: []
    },

    {
      history: [0, 1, 2, 3, 4, 5, 6].map(historyDial),
      custom: []
    },
  ];
  let subject;
  let mostVisitedConfig;

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
    mostVisitedConfig = clone(defaultConfig);
    mostVisitedConfig.response.componentsState.historyDials.visible = true;
  });

  afterEach(function () {
    clearIntervals();
  });

  describe('renders area', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: historyResponse[0],
      });
    });

    context('when set to be visible', function () {
      beforeEach(function () {
        subject.respondsWith(mostVisitedConfig);
        return subject.load();
      });

      afterEach(function () {
        subject.unload();
      });

      it('with the visibility switch turned on', function () {
        const mostVisitedSwitch = subject.queryByI18n('freshtab.app.settings.most-visited.label')
          .querySelector('input.switch');
        expect(mostVisitedSwitch).to.have.property('checked', true);
      });

      it('with visible dials', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.exist;
      });
    });

    context('when set to not be visible', function () {
      beforeEach(function () {
        subject.respondsWith(defaultConfig);
        return subject.load();
      });

      afterEach(function () {
        subject.unload();
      });

      it('with the visibility switch turned off', function () {
        const mostVisitedSwitch = subject.queryByI18n('freshtab.app.settings.most-visited.label')
          .querySelector('input.switch');
        expect(mostVisitedSwitch).to.have.property('checked', false);
      });

      it('with no visible dials', function () {
        expect(subject.query(mostVisitedAreaSelector)).to.not.exist;
      });
    });
  });

  context('when has no deleted items', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'checkForHistorySpeedDialsToRestore',
        response: false,
      });
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: historyResponse[0],
      });
      subject.respondsWith(mostVisitedConfig);

      return subject.load().then(() => {
        subject.query('#settings-btn').click();
        return waitFor(() => !subject.query('#settings-btn'));
      });
    });

    afterEach(function () {
      subject.unload();
    });

    it('restore option is not active', function () {
      const restoreButton = subject.query(restoreOptionSelector);
      expect(restoreButton.disabled).to.be.true;
    });
  });

  context('when has some deleted items', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'checkForHistorySpeedDialsToRestore',
        response: true,
      });
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: historyResponse[0],
      });
      subject.respondsWith(mostVisitedConfig);

      return subject.load().then(() => {
        subject.query('#settings-btn').click();
        return waitFor(() => !subject.query('#settings-btn'));
      });
    });

    afterEach(function () {
      subject.unload();
    });

    it('restore option is active', function () {
      const restoreButton = subject.query(restoreOptionSelector);
      expect(restoreButton.disabled).to.be.false;
    });
  });

  context('when a tile has been deleted', function () {
    const mostVisitedDeleteSelector = '#section-most-visited div.dial button.delete';
    const undoBoxSelector = 'div.undo-notification-box';

    beforeEach(function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'getSpeedDials',
        response: historyResponse[0],
      });
      subject.respondsWith(mostVisitedConfig);

      return subject.load().then(() => {
        subject.query(mostVisitedDeleteSelector).click();
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
          .to.contain.text(historyResponse[0].history[0].displayTitle);
        expect(subject.query(undoBoxSelector))
          .to.contain.text('freshtab.app.speed-dial.removed');
      });
    });
  });

  /* eslint no-loop-func: 'off' */
  describe('generated results', function () {
    for (let i = 0; i < historyResponse.length; i += 1) {
      context(`with ${i + 1} elements`, function () {
        beforeEach(function () {
          subject.respondsWith({
            module: 'freshtab',
            action: 'getSpeedDials',
            response: historyResponse[i],
          });
          subject.respondsWith(mostVisitedConfig);
          return subject.load();
        });

        afterEach(function () {
          subject.unload();
        });

        describe('renders area', function () {
          it('with an existing label', function () {
            expect(subject.query(mostVisitedHeaderSelector)).to.exist;
          });

          it('with a correct amount of elements', function () {
            const amountOfTiles = Math.min(6, historyResponse[i].history.length);
            expect(subject.queryAll(mostVisitedItemSelector).length)
              .to.equal(amountOfTiles);
          });
        });

        describe('renders each element', function () {
          const mostVisitedLogoSelector = '#section-most-visited div.dial div.logo';
          let mostVisitedItemsLogos;

          beforeEach(function () {
            mostVisitedItemsLogos = subject.queryAll(mostVisitedLogoSelector);
          });

          it('with existing square logos with correct background color', function () {
            expect(mostVisitedItemsLogos.length).to.be.above(0);
            [...mostVisitedItemsLogos].forEach(function (item) {
              expect(subject.getComputedStyle(item).background)
              .to.contain('rgb(195, 4, 62)');
            });
          });

          it('with existing and correct two chars on logos', function () {
            expect(mostVisitedItemsLogos.length).to.be.above(0);
            [...mostVisitedItemsLogos].forEach(function (item, j) {
              expect(item.textContent.length).to.equal(2);
              expect(item).to.have.text(historyResponse[i].history[j].logo.text);
            });
          });

          it('with existing and correct link titles', function () {
            const mostVisitedItemsDials = subject.queryAll(mostVisitedItemSelector);

            expect(mostVisitedItemsDials.length).to.be.above(0);
            [...mostVisitedItemsDials].forEach(function (item, j) {
              expect(item.title).to.equal(historyResponse[i].history[j].url);
            });
          });

          it('with existing and correct links', function () {
            const mostVisitedLinkSelector = '#section-most-visited div.dial a';
            const mostVisitedItemsLinks = subject.queryAll(mostVisitedLinkSelector);

            expect(mostVisitedItemsLinks.length).to.be.above(0);
            [...mostVisitedItemsLinks].forEach(function (item, j) {
              expect(item.href).to.contain(historyResponse[i].history[j].url);
            });
          });

          it('with existing and correct descriptions', function () {
            const mostVisitedDescriptionSelector = '#section-most-visited div.dial div.title';
            const mostVisitedItemsDesc = subject.queryAll(mostVisitedDescriptionSelector);

            expect(mostVisitedItemsDesc.length).to.be.above(0);
            [...mostVisitedItemsDesc].forEach(function (item, j) {
              expect(item).to.have.text(historyResponse[i].history[j].displayTitle);
            });
          });

          it('with existing delete buttons', function () {
            const mostVisitedSelector = '#section-most-visited div.dial';
            const mostVisitedItems = subject.queryAll(mostVisitedSelector);

            expect(mostVisitedItems.length).to.be.above(0);
            [...mostVisitedItems].forEach(function (item) {
              expect(item.querySelector('button.delete')).to.exist;
            });
          });
        });
      });
    }
  });
});
