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
    subject.respondsWith(defaultConfig);
  });

  context('rendered with background turned off', function () {
    before(async function () {
      await subject.load();
      backgroundSwitch = subject.queryByI18n('freshtab_app_settings_background_label')
        .querySelector('input.switch');
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-default'))).to.exist;
    });

    it('with correct background color', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-default')).background)
        .to.contain('rgb(247, 247, 247)');
    });

    it('without any bg settings being selected', function () {
      const bsSettingsSelector = 'ul.background-selection-list';
      expect(subject.query(bsSettingsSelector)).to.not.exist;
    });

    it('with background settings switch turned off', function () {
      expect(backgroundSwitch).to.have.property('checked', false);
    });
  });

  context('rendered with blue background', function () {
    before(async function () {
      const blueConfig = clone(defaultConfig);
      blueConfig.response.componentsState.background.image = 'bg-blue';
      subject.respondsWith(blueConfig);
      await subject.load();
      backgroundSwitch = subject.queryByI18n('freshtab_app_settings_background_label')
        .querySelector('input.switch');
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-blue'))).to.exist;
    });

    it('with correct image source', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-blue')).backgroundImage)
        .to.contain('https://cdn.cliqz.com/extension/newtab/background/alps.jpg');
    });

    it('with correct settings being selected', function () {
      const activeBgImage = 'img[data-bg="bg-blue"]';
      expect(subject.query(activeBgImage).className).to.contain('active');
    });

    it('with background settings switch turned on', function () {
      expect(backgroundSwitch).to.have.property('checked', true);
    });
  });

  context('rendered with dark background', function () {
    before(async function () {
      const config = clone(defaultConfig);
      config.response.componentsState.background.image = 'bg-dark';
      subject.respondsWith(config);
      await subject.load();
      backgroundSwitch = subject.queryByI18n('freshtab_app_settings_background_label')
        .querySelector('input.switch');
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-dark'))).to.exist;
    });

    it('with correct image source', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-dark')).backgroundImage)
        .to.contain('https://cdn.cliqz.com/extension/newtab/background/dark.jpg');
    });

    it('with correct settings being selected', function () {
      const activeBgImage = 'img[data-bg="bg-dark"]';
      expect(subject.query(activeBgImage).className).to.contain('active');
    });

    it('with background settings switch turned on', function () {
      expect(backgroundSwitch).to.have.property('checked', true);
    });
  });

  context('rendered with light background', function () {
    before(async function () {
      const config = clone(defaultConfig);
      config.response.componentsState.background.image = 'bg-light';
      subject.respondsWith(config);
      await subject.load();
      backgroundSwitch = subject.queryByI18n('freshtab_app_settings_background_label')
        .querySelector('input.switch');
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-light'))).to.exist;
    });

    it('with correct image source', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-light')).backgroundImage)
        .to.contain('https://cdn.cliqz.com/extension/newtab/background/light.jpg');
    });

    it('with correct settings being selected', function () {
      const activeBgImage = 'img[data-bg="bg-light"]';
      expect(subject.query(activeBgImage).className).to.contain('active');
    });

    it('with background settings switch turned on', function () {
      expect(backgroundSwitch).to.have.property('checked', true);
    });
  });

  context('rendered with matterhorn background', function () {
    before(async function () {
      const config = clone(defaultConfig);
      config.response.componentsState.background.image = 'bg-matterhorn';
      subject.respondsWith(config);
      await subject.load();
      backgroundSwitch = subject.queryByI18n('freshtab_app_settings_background_label')
        .querySelector('input.switch');
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-matterhorn'))).to.exist;
    });

    it('with correct image source', function () {
      expect(subject.getComputedStyle(subject.query('body.theme-bg-matterhorn')).backgroundImage)
        .to.contain('https://cdn.cliqz.com/extension/newtab/background/matterhorn.jpg');
    });

    it('with correct settings being selected', function () {
      const activeBgImage = 'img[data-bg="bg-matterhorn"]';
      expect(subject.query(activeBgImage).className).to.contain('active');
    });

    it('with background settings switch turned on', function () {
      expect(backgroundSwitch).to.have.property('checked', true);
    });
  });
});
