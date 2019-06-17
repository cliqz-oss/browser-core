import {
  clone,
  expect,
} from '../../core/test-helpers';
import {
  defaultConfig,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab background UI', function () {
  let backgroundSwitch;
  let subject;

  before(function () {
    subject = new Subject();

    subject.respondsWithEmptyTelemetry();

    subject.respondsWith({
      module: 'freshtab',
      action: 'getSpeedDials',
      response: {
        history: [
          {
            title: 'https://s3.amazonaws.com/cdncliqz/update/browser/latest.html',
            id: 's3.amazonaws.com/cdncliqz/update/browser/latest.html',
            url: 'https://s3.amazonaws.com/cdncliqz/update/browser/latest.html',
            displayTitle: 's3.amazonaws.com',
            custom: false,
            logo: {
              text: 's3',
              backgroundColor: 'c3043e',
              buttonsClass: 'cliqz-brands-button-1',
              style: 'background-color: #c3043e;color:#fff;'
            }
          }
        ],
        custom: []
      },
    });

    subject.respondsWithEmptyNews();
    subject.respondsWithEmptyStats();
  });

  context('with background turned off', function () {
    before(async function () {
      subject.respondsWith(defaultConfig);
      await subject.load();
      subject.query('#settings-btn').click();
      backgroundSwitch = subject.queryByI18n('freshtab_app_settings_background_label')
        .querySelector('input.switch');
    });

    after(function () {
      subject.unload();
    });

    it('renders with existing and correct class', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-default'))).to.exist;
    });

    it('renders with correct background color', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-default')).background)
        .to.contain('rgb(255, 255, 255)');
    });

    it('renders without any bg settings being selected', function () {
      const bsSettingsSelector = 'ul.background-selection-list';
      expect(subject.query(bsSettingsSelector)).to.not.exist;
    });

    it('renders with background settings switch turned off', function () {
      expect(backgroundSwitch).to.have.property('checked', false);
    });
  });

  context('with wrong background settings', function () {
    before(async function () {
      const customConfig = clone(defaultConfig);
      customConfig.response.componentsState.background.image = 'bg-testtest';
      subject.respondsWith(customConfig);
      await subject.load();
      subject.query('#settings-btn').click();
      backgroundSwitch = subject.queryByI18n('freshtab_app_settings_background_label')
        .querySelector('input.switch');
    });

    after(function () {
      subject.unload();
    });

    it('renders with default class', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-matterhorn'))).to.exist;
    });

    it('renders with correct image source', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-matterhorn')).backgroundImage)
        .to.contain('https://cdn.cliqz.com/extension/newtab/background/matterhorn');
    });

    it('renders with correct settings being selected', function () {
      const activeBgImage = 'img[data-bg="bg-matterhorn"]';
      expect(subject.query(activeBgImage).className).to.contain('active');
    });

    it('renders with background settings switch turned on', function () {
      expect(backgroundSwitch).to.have.property('checked', true);
    });
  });

  ['alps', 'light', 'dark', 'winter', 'matterhorn', 'spring', 'worldcup', 'summer', 'autumn']
    .forEach((background) => {
      context(`with ${background} background`, function () {
        before(async function () {
          const customConfig = clone(defaultConfig);
          customConfig.response.componentsState.background.image = `bg-${background}`;
          subject.respondsWith(customConfig);
          await subject.load({ iframeWidth: 1400 });
          subject.query('#settings-btn').click();
          backgroundSwitch = subject.queryByI18n('freshtab_app_settings_background_label')
            .querySelector('input.switch');
        });

        after(function () {
          subject.unload();
        });

        it('renders with and correct class', function () {
          expect(subject.getComputedStyle(subject.query(`body.theme-bg-${background}`))).to.exist;
        });

        it('renders with correct image source', function () {
          expect(subject.getComputedStyle(subject.query(`body.theme-bg-${background}`)).backgroundImage)
            .to.contain(`https://cdn.cliqz.com/extension/newtab/background/${background}`);
        });

        it('renders with correct settings being selected', function () {
          const activeBgImage = `img[data-bg="bg-${background}"]`;
          expect(subject.query(activeBgImage).className).to.contain('active');
        });

        it('renders with background settings switch turned on', function () {
          expect(backgroundSwitch).to.have.property('checked', true);
        });
      });
    });
});
