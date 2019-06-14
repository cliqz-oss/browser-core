import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import {
  allBackgrounds,
  checkMessages,
  checkTelemetry,
  defaultConfig,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab interactions with background', function () {
  let subject;

  beforeEach(async function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithEmptySpeedDials();
    subject.respondsWithEmptyNews();
    subject.respondsWithEmptyStats();
    subject.respondsWith(defaultConfig);

    await subject.load();
    subject.query('#settings-btn').click();
    subject.getElementSwitch('background').click();
    await waitFor(() => subject.query('ul.background-selection-list'));
  });

  afterEach(function () {
    subject.unload();
  });

  allBackgrounds.forEach((bg) => {
    describe(`clicking on a ${bg.name} icon`, function () {
      beforeEach(async function () {
        subject.startListening();
        subject.query(bg.iconSelector).click();
        await waitFor(() => subject.query(bg.bgSelector));
      });

      it(`changes bg to ${bg.name}`, function () {
        expect(subject.query('body').className).to.contain(bg.className);
      });

      it(`changes settings selection to ${bg.name} bg`, function () {
        allBackgrounds.forEach((icon) => {
          if (icon.name === bg.name) {
            expect(subject.query(icon.iconSelector).className).to.contain('active');
          } else {
            expect(subject.query(icon.iconSelector).className).to.not.contain('active');
          }
        });
      });

      checkMessages({
        messageName: 'saveBackgroundImage',
        subject: () => subject,
      });

      it('sends a "home > settings > background_image > click" telemetry signal', function () {
        checkTelemetry({
          action: 'click',
          subject: () => subject,
          target: 'background_image',
          type: 'home',
          view: 'settings',
        });
      });
    });
  });
});
