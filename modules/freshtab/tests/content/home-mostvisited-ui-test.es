import {
  clone,
  expect,
  waitFor,
} from '../../core/test-helpers';
import {
  defaultConfig,
  generateHistoryResponse,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab most visited UI', function () {
  let subject;
  let mostVisitedConfig;

  const areaSelector = '#section-most-visited';
  const headerSelector = '#section-most-visited .dial-header';
  const dialSelector = '#section-most-visited a.dial';
  const restoreOptionSelector = '#settings-panel button.link';
  const historyResponse = generateHistoryResponse();
  const respondWithOneElement = () => {
    subject.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: historyResponse[0],
    });
  };


  beforeEach(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptyNews();
    subject.respondsWithEmptyStats();
    mostVisitedConfig = clone(defaultConfig);
    mostVisitedConfig.response.componentsState.historyDials.visible = true;
  });

  describe('renders area', function () {
    beforeEach(function () {
      respondWithOneElement();
    });

    context('when set to be visible', function () {
      beforeEach(async function () {
        subject.respondsWith(mostVisitedConfig);
        await subject.load();
        return subject.query('#settings-btn').click();
      });

      afterEach(function () {
        subject.unload();
      });

      it('with the visibility switch turned on', function () {
        const mostVisitedSwitch = subject.queryByI18n('freshtab_app_settings_most_visited_label')
          .querySelector('input.switch');
        expect(mostVisitedSwitch).to.have.property('checked', true);
      });

      it('with visible dials', function () {
        expect(subject.query(areaSelector)).to.exist;
      });
    });

    context('when set to not be visible', function () {
      beforeEach(async function () {
        subject.respondsWith(defaultConfig);
        await subject.load();
        return subject.query('#settings-btn').click();
      });

      afterEach(function () {
        subject.unload();
      });

      it('with the visibility switch turned off', function () {
        const mostVisitedSwitch = subject.queryByI18n('freshtab_app_settings_most_visited_label')
          .querySelector('input.switch');
        expect(mostVisitedSwitch).to.have.property('checked', false);
      });

      it('with no visible dials', function () {
        expect(subject.query(areaSelector)).to.not.exist;
      });
    });
  });

  context('when has no deleted items', function () {
    beforeEach(async function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'checkForHistorySpeedDialsToRestore',
        response: false,
      });
      respondWithOneElement();
      subject.respondsWith(mostVisitedConfig);
      await subject.load();
      return subject.query('#settings-btn').click();
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
    beforeEach(async function () {
      subject.respondsWith({
        module: 'freshtab',
        action: 'checkForHistorySpeedDialsToRestore',
        response: true,
      });
      respondWithOneElement();
      subject.respondsWith(mostVisitedConfig);

      await subject.load();
      subject.query('#settings-btn').click();
      return waitFor(() => !subject.query('#settings-btn'));
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
    const deleteSelector = '#section-most-visited a.dial button.delete';
    const undoBoxSelector = '.undo-notification-box';

    beforeEach(async function () {
      respondWithOneElement();
      subject.respondsWith(mostVisitedConfig);

      await subject.load();
      subject.query(deleteSelector).click();
      return waitFor(() => subject.query(undoBoxSelector));
    });

    afterEach(function () {
      subject.unload();
    });

    describe('renders undo popup message', function () {
      it('successfully', function () {
        expect(subject.query(undoBoxSelector)).to.exist;
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
          .to.contain.text(historyResponse[0].history[0].displayTitle);
        expect(subject.query(undoBoxSelector))
          .to.contain.text('freshtab_app_speed_dial_removed');
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
            expect(subject.query(headerSelector)).to.exist;
          });

          it('with a correct amount of elements', function () {
            const amountOfTiles = Math.min(6, historyResponse[i].history.length);
            expect(subject.queryAll(dialSelector).length)
              .to.equal(amountOfTiles);
          });
        });

        describe('renders each element', function () {
          const logoSelector = '#section-most-visited a.dial .logo';
          let $logos;

          beforeEach(function () {
            $logos = subject.queryAll(logoSelector);
          });

          it('with existing square logos with correct background color', function () {
            expect($logos.length).to.be.above(0);
            [...$logos].forEach(function (item) {
              expect(subject.getComputedStyle(item).background)
                .to.contain('rgb(195, 4, 62)');
            });
          });

          it('with existing and correct two chars on logos', function () {
            expect($logos.length).to.be.above(0);
            [...$logos].forEach(function (item, j) {
              expect(item.textContent.length).to.equal(2);
              expect(item).to.have.text(historyResponse[i].history[j].logo.text);
            });
          });

          it('with existing and correct link titles', function () {
            const $dials = subject.queryAll(dialSelector);

            expect($dials.length).to.be.above(0);
            [...$dials].forEach(function (item, j) {
              expect(item.title).to.equal(historyResponse[i].history[j].displayTitle);
            });
          });

          it('with existing and correct links', function () {
            const linkSelector = '#section-most-visited a.dial';
            const $links = subject.queryAll(linkSelector);

            expect($links.length).to.be.above(0);
            [...$links].forEach(function (item, j) {
              expect(item.href).to.contain(historyResponse[i].history[j].url);
            });
          });

          it('with existing and correct descriptions', function () {
            const descriptionSelector = '#section-most-visited a.dial .title';
            const $descriptions = subject.queryAll(descriptionSelector);

            expect($descriptions.length).to.be.above(0);
            [...$descriptions].forEach(function (item, j) {
              expect(item).to.have.text(historyResponse[i].history[j].displayTitle);
            });
          });

          it('with existing delete buttons', function () {
            const $dials = subject.queryAll(dialSelector);

            expect($dials.length).to.be.above(0);
            [...$dials].forEach(function (item) {
              expect(item.querySelector('button.delete')).to.exist;
            });
          });
        });
      });
    }
  });
});
