import {
  clone,
  clearIntervals,
  Subject,
  defaultConfig,
} from './helpers';

describe('Fresh tab background UI', function () {
  let backgroundSwitch;
  let subject;

  before(function () {
    subject = new Subject({ iframeWidth: 900 });

    subject.respondsWith({
      module: 'core',
      action: 'sendTelemetry',
      response: ''
    });

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

    subject.respondsWith({
      module: 'freshtab',
      action: 'getNews',
      response: {
        version: 0,
        news: []
      }
    });

    subject.respondsWith(defaultConfig);
  });

  after(function () {
    clearIntervals();
  });

  context('rendered with background turned off', function () {
    before(function () {
      const noBgConfig = clone(defaultConfig);
      noBgConfig.response.componentsState.background.image = 'bg-default';
      subject.respondsWith(noBgConfig);
      return subject.load().then(function () {
        backgroundSwitch = subject.queryByI18n('freshtab.app.settings.background.label')
          .querySelector('input.switch');
      });
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-default')).to.exist;
    });

    it('with correct background color', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-default').background)
        .to.contain('rgb(247, 247, 247)');
    });

    it('without any bg settings being selected', function () {
      const bsSettingsSelector = 'ul.background-selection-list';
      chai.expect(subject.query(bsSettingsSelector)).to.not.exist;
    });

    it('with background settings switch turned off', function () {
      chai.expect(backgroundSwitch).to.have.property('checked', false);
    });
  });

  context('rendered with blue background', function () {
    before(function () {
      const blueConfig = clone(defaultConfig);
      blueConfig.response.componentsState.background.image = 'bg-blue';
      subject.respondsWith(blueConfig);
      return subject.load().then(function () {
        backgroundSwitch = subject.queryByI18n('freshtab.app.settings.background.label')
          .querySelector('input.switch');
      });
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-blue')).to.exist;
    });

    it('with correct image source', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-blue').backgroundImage)
        .to.contain('https://cdn.cliqz.com/extension/newtab/background/alps.jpg');
    });

    it('with correct settings being selected', function () {
      const activeBgImage = 'img[data-bg="bg-blue"]';
      chai.expect(subject.query(activeBgImage).className).to.contain('active');
    });

    it('with background settings switch turned on', function () {
      chai.expect(backgroundSwitch).to.have.property('checked', true);
    });
  });

  context('rendered with dark background', function () {
    before(function () {
      const config = clone(defaultConfig);
      config.response.componentsState.background.image = 'bg-dark';
      subject.respondsWith(config);
      return subject.load().then(function () {
        backgroundSwitch = subject.queryByI18n('freshtab.app.settings.background.label')
          .querySelector('input.switch');
      });
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-dark')).to.exist;
    });

    it('with correct image source', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-dark').backgroundImage)
        .to.contain('https://cdn.cliqz.com/extension/newtab/background/dark.jpg');
    });

    it('with correct settings being selected', function () {
      const activeBgImage = 'img[data-bg="bg-dark"]';
      chai.expect(subject.query(activeBgImage).className).to.contain('active');
    });

    it('with background settings switch turned on', function () {
      chai.expect(backgroundSwitch).to.have.property('checked', true);
    });
  });

  context('rendered with light background', function () {
    before(function () {
      const config = clone(defaultConfig);
      config.response.componentsState.background.image = 'bg-light';
      subject.respondsWith(config);
      return subject.load().then(function () {
        backgroundSwitch = subject.queryByI18n('freshtab.app.settings.background.label')
          .querySelector('input.switch');
      });
    });

    after(function () {
      subject.unload();
    });

    it('with existing and correct class', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-light')).to.exist;
    });

    it('with correct image source', function () {
      chai.expect(subject.getComputedStyle('body.theme-bg-light').backgroundImage)
        .to.contain('https://cdn.cliqz.com/extension/newtab/background/light.jpg');
    });

    it('with correct settings being selected', function () {
      const activeBgImage = 'img[data-bg="bg-light"]';
      chai.expect(subject.query(activeBgImage).className).to.contain('active');
    });

    it('with background settings switch turned on', function () {
      chai.expect(backgroundSwitch).to.have.property('checked', true);
    });
  });
});
