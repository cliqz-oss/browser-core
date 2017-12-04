import {
  clone,
  clearIntervals,
  Subject,
  defaultConfig,
} from './helpers';

describe('Fresh tab search UI', function () {
  const searchAreaSelector = '#section-url-bar';
  let subject;
  let searchConfig;

  before(function () {
    subject = new Subject();
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

    searchConfig = clone(defaultConfig);
    searchConfig.response.componentsState.search.visible = true;
  });

  after(function () {
    clearIntervals();
  });

  context('renders search area', function () {
    before(function () {
      subject.respondsWith(searchConfig);
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    it('with an input field', function () {
      const inputSelector = '#section-url-bar div.search input';
      chai.expect(subject.query(inputSelector)).to.exist;
      chai.expect(subject.query(inputSelector).type).to.equal('text');
    });

    it('with a background with Q icon', function () {
      const inputSelector = '#section-url-bar div.search input';
      chai.expect(subject.getComputedStyle(inputSelector).backgroundImage)
        .to.contain('cliqz_icon2_1024.svg');
    });
  });

  context('when set to be visible', function () {
    before(function () {
      subject.respondsWith(searchConfig);
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    it('has the visibility switch turned on', function () {
      const newsSwitch = subject.queryByI18n('freshtab.app.settings.search.label')
        .querySelector('input.switch');
      chai.expect(newsSwitch).to.have.property('checked', true);
    });

    it('has visible area with search input', function () {
      chai.expect(subject.query(searchAreaSelector)).to.exist;
    });
  });

  context('when set to not be visible', function () {
    before(function () {
      const configNotVisible = clone(defaultConfig);
      configNotVisible.response.componentsState.search.visible = false;
      subject.respondsWith(configNotVisible);
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    it('has the visibility switch turned off', function () {
      const newsSwitch = subject.queryByI18n('freshtab.app.settings.search.label')
        .querySelector('input.switch');
      chai.expect(newsSwitch).to.have.property('checked', false);
    });

    /* In contrast to other sections' behavior, #section-url-bar does
    not disappear when switched off, but gets empty */
    it('has no visible area search input', function () {
      chai.expect(subject.query(searchAreaSelector).innerHTML).to.be.empty;
    });
  });
});
