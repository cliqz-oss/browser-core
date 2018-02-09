import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import generateData from './fixtures/other-settings-section';

function otherSettingsTests(amo, tipsUrl) {
  const data = generateData(amo);
  let subject;

  before(function () {
    subject = new Subject();
    return subject.load();
  })

  after(function () {
    subject.unload();
    clearIntervals();
  });

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('Other Settings', function () {
    before(() => {
      return subject.pushData(data);
    });

    it('other setting section exists', function () {
      chai.expect(subject.query('#othersettings')).to.exist;
    });

    it('renders other settings section header', function () {
      chai.expect(subject.query('#othersettings .header')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '#othersettings .header .title [data-i18n="control-center-othersettings"]';
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-othersettings');
    });

    it('support section exists', function () {
      chai.expect(subject.query('#othersettings .title #support')).to.exist;
    });

    it('renders "Support"', function () {
      const supportSelector = '#othersettings .title #support [data-i18n="control-center-support"]';
      chai.expect(subject.query(supportSelector)).to.exist;
      chai.expect(subject.query(supportSelector).textContent.trim()).to.equal('control-center-support');
    });

    it('url for Support is correct', function () {
      const supportSelector = '#othersettings .title #support [data-i18n="control-center-support"]';
      chai.expect(subject.query(supportSelector).hasAttribute('openurl')).to.be.true;
      chai.expect(subject.query(supportSelector).getAttribute('openurl')).to.equal('https://cliqz.com/feedback/1.19.0.dev-40');
    });

    it('renders "Tips"', function () {
      const tipsSelector = '#othersettings .title #support [data-i18n="control-center-tips"]';
      chai.expect(subject.query(tipsSelector)).to.exist;
      chai.expect(subject.query(tipsSelector).textContent.trim()).to.equal('control-center-tips');
    });

    it('url for Tips is correct', function () {
      const tipsSelector = '#othersettings .title #support [data-i18n="control-center-tips"]';
      chai.expect(subject.query(tipsSelector).hasAttribute('openurl')).to.be.true;
      chai.expect(subject.query(tipsSelector).getAttribute('openurl')).to.equal(tipsUrl);
    });

    it('renders "Search options"', function () {
      const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-2"] [data-i18n="control-center-searchoptions"]';
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-searchoptions');
    });

    it('renders arrow for search options', function () {
      const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-2"] #arrow';
      chai.expect(subject.query(arrowSelector)).to.exist;
    });

    it('renders "History options"', function () {
      const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-3"] [data-i18n="control-center-history-options"]';
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-history-options');
    });

    it('renders arrow for history options', function () {
      const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-3"] #arrow';
      chai.expect(subject.query(arrowSelector)).to.exist;
    });

    it('renders "MyOffrz options"', function () {
      const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-4"] [data-i18n="control-center-offers-options"]';
      chai.expect(subject.query(titleSelector)).to.exist;
      chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-offers-options');
    });

    it('renders arrow for myoffrz options', function () {
      const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-4"] #arrow';
      chai.expect(subject.query(arrowSelector)).to.exist;
    });
  });
};

describe('Control Center: Other Settings section UI browser', function () {
  otherSettingsTests(false, 'https://cliqz.com/tips');
});

describe('Control Center: AMO, Other Settings section tests', function () {
  otherSettingsTests(true, 'https://cliqz.com/tips-firefox');
})
