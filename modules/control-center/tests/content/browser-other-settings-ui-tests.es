import {
  clearIntervals,
  expect
} from '../../core/test-helpers';
import Subject from './local-helpers';
import generateData from './fixtures/other-settings-section';

function otherSettingsTests(amo, tipsUrl) {
  const data = generateData(amo);
  const target = 'cliqz-control-center';
  let subject;

  before(function () {
    subject = new Subject();
    return subject.load();
  });

  after(function () {
    subject.unload();
    clearIntervals();
  });

  describe('Other Settings', function () {
    before(function () {
      return subject.pushData(target, data);
    });

    it('other setting section exists', function () {
      expect(subject.query('#othersettings')).to.exist;
    });

    it('renders other settings section header', function () {
      expect(subject.query('#othersettings .header')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '#othersettings .header .title [data-i18n="control-center-othersettings"]';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-othersettings');
    });

    it('support section exists', function () {
      expect(subject.query('#othersettings .title #support')).to.exist;
    });

    it('renders "Support"', function () {
      const supportSelector = '#othersettings .title #support [data-i18n="control-center-support"]';
      expect(subject.query(supportSelector)).to.exist;
      expect(subject.query(supportSelector).textContent.trim()).to.equal('control-center-support');
    });

    it('url for Support is correct', function () {
      const supportSelector = '#othersettings .title #support [data-i18n="control-center-support"]';
      expect(subject.query(supportSelector).hasAttribute('data-open-url')).to.be.true;
      expect(subject.query(supportSelector).getAttribute('data-open-url')).to.equal('https://cliqz.com/feedback/1.19.0.dev-40');
    });

    it('renders "Tips"', function () {
      const tipsSelector = '#othersettings .title #support [data-i18n="control-center-tips"]';
      expect(subject.query(tipsSelector)).to.exist;
      expect(subject.query(tipsSelector).textContent.trim()).to.equal('control-center-tips');
    });

    it('url for Tips is correct', function () {
      const tipsSelector = '#othersettings .title #support [data-i18n="control-center-tips"]';
      expect(subject.query(tipsSelector).hasAttribute('data-open-url')).to.be.true;
      expect(subject.query(tipsSelector).getAttribute('data-open-url')).to.equal(tipsUrl);
    });

    it('renders "Search options"', function () {
      const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-2"] [data-i18n="control-center-searchoptions"]';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-searchoptions');
    });

    it('renders arrow for search options', function () {
      const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-2"] #arrow';
      expect(subject.query(arrowSelector)).to.exist;
    });

    it('renders "History options"', function () {
      const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-3"] [data-i18n="control-center-history-options"]';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-history-options');
    });

    it('renders arrow for history options', function () {
      const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-3"] #arrow';
      expect(subject.query(arrowSelector)).to.exist;
    });

    it('renders "MyOffrz options"', function () {
      const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-4"] [data-i18n="control-center-offers-options"]';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-offers-options');
    });

    it('renders arrow for myoffrz options', function () {
      const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-4"] #arrow';
      expect(subject.query(arrowSelector)).to.exist;
    });
  });
}

describe('Control Center: Other Settings section UI browser', function () {
  otherSettingsTests(false, 'https://cliqz.com/tips');
});

describe('Control Center: AMO, Other Settings section tests', function () {
  otherSettingsTests(true, 'https://cliqz.com/tips-firefox');
});
