import {
  expect,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import generateData from './fixtures/other-settings-section';

function otherSettingsTests(amo) {
  const data = generateData(amo);
  const target = 'control-center';
  let subject;

  before(function () {
    subject = new Subject();
    subject.respondsWith({
      module: target,
      action: 'getData',
      response: data
    });
    return subject.load();
  });

  after(function () {
    subject.unload();
  });

  describe('Other Settings', function () {
    it('other setting section exists', function () {
      expect(subject.query('#othersettings')).to.exist;
    });

    it('renders other settings section header', function () {
      expect(subject.query('#othersettings .header')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '#othersettings .header .title [data-i18n="control_center_othersettings"]';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_othersettings');
    });

    it('support section exists', function () {
      expect(subject.query('#othersettings .title #support')).to.exist;
    });

    it('renders "Support"', function () {
      const supportSelector = '#othersettings .title #support [data-i18n="control_center_support"]';
      expect(subject.query(supportSelector)).to.exist;
      expect(subject.query(supportSelector).textContent.trim()).to.equal('control_center_support');
    });

    it('url for Support is correct', function () {
      const supportSelector = '#othersettings .title #support [data-i18n="control_center_support"]';
      expect(subject.query(supportSelector).hasAttribute('data-open-url')).to.be.true;
      expect(subject.query(supportSelector).getAttribute('data-open-url')).to.equal('https://cliqz.com/feedback/1.19.0.dev-40');
    });

    it('renders "privacy"', function () {
      const privacySelector = '#othersettings .title #support [data-i18n="control_center_privacy_policy"]';
      expect(subject.query(privacySelector)).to.exist;
      expect(subject.query(privacySelector).textContent.trim()).to.equal('control_center_privacy_policy');
    });

    it('url for privacy is correct', function () {
      const privacySelector = '#othersettings .title #support [data-i18n="control_center_privacy_policy"]';
      expect(subject.query(privacySelector).hasAttribute('data-open-url')).to.be.true;
      expect(subject.query(privacySelector).getAttribute('data-open-url')).to.equal('privacy_policy_url');
    });

    it('renders "Search options"', function () {
      const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-2"] [data-i18n="control_center_searchoptions"]';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_searchoptions');
    });

    it('renders arrow for search options', function () {
      const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-2"] #arrow';
      expect(subject.query(arrowSelector)).to.exist;
    });

    it('renders "MyOffrz options"', function () {
      const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-4"] [data-i18n="control_center_offers_options"]';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_offers_options');
    });

    it('renders arrow for myoffrz options', function () {
      const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-4"] #arrow';
      expect(subject.query(arrowSelector)).to.exist;
    });
  });
}

describe('Control Center: Other Settings section UI browser', function () {
  otherSettingsTests(false);
});

describe('Control Center: AMO, Other Settings section tests', function () {
  otherSettingsTests(true);
});
