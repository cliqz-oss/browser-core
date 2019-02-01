import {
  expect,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import data from './fixtures/amo-all-modules';


describe('Control Center: AMO, all modules are present', function () {
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
      const headerSelector = '#control-center .amo #header';
      expect(subject.query(headerSelector)).to.exist;
    });
  });

  context('current site part', function () {
    it('exists', function () {
      const sitePartSelector = '#control-center .amo #currentsite';
      expect(subject.query(sitePartSelector)).to.exist;
    });
  });

  context('settings part', function () {
    it('exists', function () {
      const settingsSelector = '#control-center .amo #settings';
      expect(subject.query(settingsSelector)).to.exist;
    });

    it('renders antitracking module', function () {
      const antitrackingSelector = '#control-center .amo #settings #anti-tracking';
      expect(subject.query(antitrackingSelector)).to.exist;
    });

    it('renders antiphishing module', function () {
      const antiphishingSelector = '#control-center .amo #settings #anti-phising';
      expect(subject.query(antiphishingSelector)).to.exist;
    });

    it('renders cliqz tab module', function () {
      const cliqzTabSelector = '#control-center .amo #settings #cliqz-tab';
      expect(subject.query(cliqzTabSelector)).to.exist;
    });
  });

  context('other settings part', function () {
    it('exists', function () {
      const otherSettingsSelector = '#control-center .amo #othersettings';
      expect(subject.query(otherSettingsSelector)).to.exist;
    });

    it('renders header', function () {
      const headerSelector = '#control-center .amo #othersettings .header';
      expect(subject.query(headerSelector)).to.exist;
    });

    it('renders Search options', function () {
      const searchSelector = '#control-center .amo #othersettings .accordion .accordion-section-title[href="#accordion-2"]';
      expect(subject.query(searchSelector)).to.exist;
    });

    it('renders MyOffrz options', function () {
      const myOffrzSelector = '#control-center .amo #othersettings .accordion .accordion-section-title[href="#accordion-4"]';
      expect(subject.query(myOffrzSelector)).to.exist;
    });
  });
});
