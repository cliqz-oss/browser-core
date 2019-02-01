import {
  expect,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import data from './fixtures/browser-all-modules';

describe('Extension, all modules are present', function () {
  let subject;
  const target = 'control-center';

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

  context('header part', function () {
    it('exists', function () {
      const headerSelector = '#control-center #header';
      expect(subject.query(headerSelector)).to.exist;
    });
  });

  context('current site part', function () {
    it('exists', function () {
      const sitePartSelector = '#control-center #currentsite';
      expect(subject.query(sitePartSelector)).to.exist;
    });
  });

  context('settings part', function () {
    it('exists', function () {
      const settingsSelector = '#control-center #settings';
      expect(subject.query(settingsSelector)).to.exist;
    });

    it('renders antitracking module', function () {
      const antitrackingSelector = '#control-center #settings #anti-tracking';
      expect(subject.query(antitrackingSelector)).to.exist;
    });

    it('renders adblocker module', function () {
      const adblockerSelector = '#control-center #settings #ad-blocking';
      expect(subject.query(adblockerSelector)).to.exist;
    });

    it('renders antiphishing module', function () {
      const antiphishingSelector = '#control-center #settings #anti-phising';
      expect(subject.query(antiphishingSelector)).to.exist;
    });

    it('renders https module', function () {
      const httpsSelector = '#control-center #settings #https';
      expect(subject.query(httpsSelector)).to.exist;
    });
  });

  context('other settings part', function () {
    it('exists', function () {
      const otherSettingsSelector = '#control-center #othersettings';
      expect(subject.query(otherSettingsSelector)).to.exist;
    });

    it('renders header', function () {
      const headerSelector = '#control-center #othersettings .header';
      expect(subject.query(headerSelector)).to.exist;
    });

    it('renders Search options', function () {
      const searchSelector = '#control-center #othersettings .accordion .accordion-section-title[href="#accordion-2"]';
      expect(subject.query(searchSelector)).to.exist;
    });

    it('renders MyOffrz options', function () {
      const myOffrzSelector = '#control-center #othersettings .accordion .accordion-section-title[href="#accordion-4"]';
      expect(subject.query(myOffrzSelector)).to.exist;
    });
  });
});
