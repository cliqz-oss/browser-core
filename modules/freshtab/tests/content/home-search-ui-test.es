import {
  clone,
  expect,
} from '../../core/test-helpers';
import {
  defaultConfig,
  Subject,
} from '../../core/test-helpers-freshtab';

describe('Freshtab search UI', function () {
  const searchAreaSelector = '#section-url-bar';
  let subject;
  let searchConfig;

  before(function () {
    subject = new Subject();
    subject.respondsWithEmptyTelemetry();
    subject.respondsWithOneHistory();
    subject.respondsWithEmptyNews();
    subject.respondsWithEmptyStats();

    searchConfig = clone(defaultConfig);
    searchConfig.response.componentsState.search.visible = true;
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
      const inputSelector = '#section-url-bar .search input';
      expect(subject.query(inputSelector)).to.exist;
      expect(subject.query(inputSelector).type).to.equal('text');
    });

    it('with a background with Q icon', function () {
      const inputSelector = '#section-url-bar .search input';
      expect(subject.getComputedStyle(subject.query(inputSelector)).backgroundImage)
        .to.contain('cliqz_icon2_1024.svg');
    });
  });

  context('when set to be visible', function () {
    before(async function () {
      subject.respondsWith(searchConfig);
      await subject.load();
      return subject.query('#settings-btn').click();
    });

    after(function () {
      subject.unload();
    });

    it('has the visibility switch turned on', function () {
      const newsSwitch = subject.queryByI18n('freshtab_app_settings_search_label')
        .querySelector('input.switch');
      expect(newsSwitch).to.have.property('checked', true);
    });

    it('has visible area with search input', function () {
      expect(subject.query(searchAreaSelector)).to.exist;
    });
  });

  context('when set to not be visible', function () {
    before(async function () {
      const configNotVisible = clone(defaultConfig);
      configNotVisible.response.componentsState.search.visible = false;
      subject.respondsWith(configNotVisible);
      await subject.load();
      return subject.query('#settings-btn').click();
    });

    after(function () {
      subject.unload();
    });

    it('has the visibility switch turned off', function () {
      const newsSwitch = subject.queryByI18n('freshtab_app_settings_search_label')
        .querySelector('input.switch');
      expect(newsSwitch).to.have.property('checked', false);
    });

    /* In contrast to other sections' behavior, #section-url-bar does
    not disappear when switched off, but gets empty */
    it('has no visible area search input', function () {
      expect(subject.query(searchAreaSelector)).to.not.exist;
    });
  });
});
