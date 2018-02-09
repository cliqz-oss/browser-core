import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import {generateDataFalse, generateDataTrue} from './fixtures/current-site';

function currentSiteTests(amo) {
  const dataFalse = generateDataFalse(amo);
  const dataTrue = generateDataTrue(amo);
  let subject;

  before(function () {
    subject = new Subject();
    return subject.load();
  });

  after(function () {
    subject.unload();
    clearIntervals();
  });

  it('loads', function () {
    chai.expect(true).to.eql(true);
  });

  describe('pushing data, specialUrl = false', function () {
    before(() => {
      return subject.pushData(dataFalse);
    });

    it('exists', function () {
      const sectionSelector = '#control-center #currentsite';
      chai.expect(subject.query(sectionSelector)).to.exist;
    });

    it('renders site name', function () {
      const siteSelector = '#control-center #currentsite .truncate .dark';
      chai.expect(subject.query(siteSelector)).to.exist;
      chai.expect(subject.query(siteSelector).textContent.trim()).to.equal(dataFalse.domain);
    });

    it('link for "Report URL" is correct', function () {
      const objectSelector = '#control-center #currentsite .reportsite';
      chai.expect(subject.query(objectSelector)).to.exist;
      chai.expect(subject.query(objectSelector).getAttribute('openurl')).to.equal('https://cliqz.com/report-url');
    });

    it('renders "Report URL"', function () {
      const linkSelector = '#control-center #currentsite .reportsite[data-i18n="control-center-report-url"]';
      chai.expect(subject.query(linkSelector)).to.exist;
      chai.expect(subject.query(linkSelector).textContent.trim()).to.equal('control-center-report-url');
    });
  });

  describe('pushing data, specialUrl = true', function () {
    before(() => {
      return subject.pushData(dataTrue);
    });

    it('exists', function () {
      const sectionSelector = '#control-center #currentsite';
      chai.expect(subject.query(sectionSelector)).to.exist;
    });

    it('renders site name', function () {
      const siteSelector = '#control-center #currentsite .truncate .dark';
      chai.expect(subject.query(siteSelector)).to.exist;
      chai.expect(subject.query(siteSelector).textContent.trim()).to.equal(dataTrue.friendlyURL);
    });

    it('link for "Report URL" is correct', function () {
      const objectSelector = '#control-center #currentsite .reportsite';
      chai.expect(subject.query(objectSelector)).to.exist;
      chai.expect(subject.query(objectSelector).getAttribute('openurl')).to.equal('https://cliqz.com/report-url');
    });

    it('renders "Report URL"', function () {
      const linkSelector = '#control-center #currentsite .reportsite[data-i18n="control-center-report-url"]';
      chai.expect(subject.query(linkSelector)).to.exist;
      chai.expect(subject.query(linkSelector).textContent.trim()).to.equal('control-center-report-url');
    });
  });
};

describe('Control Center: Current site section UI tests browser', function () {
  currentSiteTests(false);
});

describe('Control Center: AMO, Current site section UI tests', function () {
  currentSiteTests(true);
})
