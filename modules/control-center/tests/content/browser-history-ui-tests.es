/* global document */

import {
  clearIntervals,
  expect,
  waitFor
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataOn, dataOff, dataAmo } from './fixtures/history-section';

describe('Control Center: History options browser', function () {
  let subject;
  const target = 'cliqz-control-center';

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  });

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  function historySectionTests() {
    it('history section appeared', function () {
      expect(subject.query('.accordion #accordion-3.accordion-section-content.open')).to.exist;
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

    it('renders three options', function () {
      expect(subject.queryAll('.accordion #accordion-3 .bullet').length).to.equal(3);
    });

    it('renders "Show all history"', function () {
      const historySelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-show-history"]';
      expect(subject.query(historySelector)).to.exist;
      expect(subject.query(historySelector).textContent.trim()).to.equal('control-center-show-history');
    });

    it('renders button "Open" for "Show all history"', function () {
      const buttonSelector = '.accordion #accordion-3 .bullet [data-open-url="history"]';
      expect(subject.query(buttonSelector)).to.exist;
      expect(subject.query(buttonSelector).textContent.trim()).to.equal('control-center-open');
    });

    it('renders "Forget history"', function () {
      const forgetSelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-forget-history"]';
      expect(subject.query(forgetSelector)).to.exist;
      expect(subject.query(forgetSelector).textContent.trim()).to.equal('control-center-forget-history');
    });

    it('renders button "Open" for "Forget history"', function () {
      const buttonSelector = '.accordion #accordion-3 .bullet [data-open-url="forget_history"]';
      expect(subject.query(buttonSelector)).to.exist;
      expect(subject.query(buttonSelector).textContent.trim()).to.equal('control-center-open');
    });

    it('renders dropdown for autoforget mode', function () {
      expect(subject.query('.accordion #accordion-3 .bullet .custom-dropdown')).to.exist;
    });
  }

  describe('with autoforget mode on', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOn);
    });

    it('history section exists', function () {
      expect(subject.query('#othersettings .accordion [data-target="history"]')).to.exist;
    });

    describe('click on the history section', function () {
      beforeEach(function () {
        subject.query('#othersettings .accordion [data-target="history"]').click();
        return waitFor(() => subject.query('.accordion .accordion-section-title[href="#accordion-3"]').classList.contains('active'));
      });

      historySectionTests();

      it('renders "Automatic forget mode"', function () {
        const modeSelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-forget-mode"]';
        expect(subject.query(modeSelector)).to.exist;
        expect(subject.query(modeSelector).textContent.trim()).to.equal('control-center-forget-mode');
      });

      it('renders info button', function () {
        expect(subject.query('.accordion #accordion-3 .bullet .infobutton')).to.exist;
      });


      it('Automatic forget mode is on', function () {
        const select = subject.query('.accordion #accordion-3 .bullet .custom-dropdown');
        const evt = document.createEvent('HTMLEvents');
        select.addEventListener('change', console.log);
        evt.initEvent('change', true, true);
        select.dispatchEvent(evt);
        return waitFor(
          () => subject.messages.find(message => message.message.action === 'updatePref')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.pref', 'browser.privatebrowsing.apt');
            expect(message).to.have.nested.property('message.data.value', 'true');
            expect(message).to.have.nested.property('message.data.target', 'history_autoforget');
            expect(message).to.have.nested.property('message.data.prefType', 'boolean');
          }
        );
      });
    });
  });

  describe('with autoforget mode off', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOff);
    });

    it('history section exists', function () {
      expect(subject.query('#othersettings .accordion [data-target="history"]')).to.exist;
    });

    describe('click on the history section', function () {
      beforeEach(function () {
        subject.query('#othersettings .accordion [data-target="history"]').click();
        return waitFor(() => subject.query('.accordion .accordion-section-title[href="#accordion-3"]').classList.contains('active'));
      });

      historySectionTests();

      it('renders "Automatic forget mode"', function () {
        const modeSelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-forget-mode"]';
        expect(subject.query(modeSelector)).to.exist;
        expect(subject.query(modeSelector).textContent.trim()).to.equal('control-center-forget-mode');
      });

      it('renders info button', function () {
        expect(subject.query('.accordion #accordion-3 .bullet .infobutton')).to.exist;
      });

      it('Automatic forget mode is off', function () {
        const select = subject.query('.accordion #accordion-3 .bullet .custom-dropdown');
        const evt = document.createEvent('HTMLEvents');
        select.addEventListener('change', console.log);
        evt.initEvent('change', true, true);
        select.dispatchEvent(evt);
        return waitFor(
          () => subject.messages.find(message => message.message.action === 'updatePref')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.pref', 'browser.privatebrowsing.apt');
            expect(message).to.have.nested.property('message.data.value', 'false');
            expect(message).to.have.nested.property('message.data.target', 'history_autoforget');
            expect(message).to.have.nested.property('message.data.prefType', 'boolean');
          }
        );
      });
    });
  });
});

describe('Control Center: AMO, History options tests', function () {
  let subject;
  const target = 'cliqz-control-center';

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  });

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  function historySectionTests() {
    it('history section appeared', function () {
      expect(subject.query('.accordion #accordion-3.accordion-section-content.open')).to.exist;
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

    it('renders two options', function () {
      expect(subject.queryAll('.accordion #accordion-3 .bullet').length).to.equal(2);
    });

    it('renders "Show all history"', function () {
      const historySelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-show-history"]';
      expect(subject.query(historySelector)).to.exist;
      expect(subject.query(historySelector).textContent.trim()).to.equal('control-center-show-history');
    });

    it('renders button "Open" for "Show all history"', function () {
      const buttonSelector = '.accordion #accordion-3 .bullet [data-open-url="history"]';
      expect(subject.query(buttonSelector)).to.exist;
      expect(subject.query(buttonSelector).textContent.trim()).to.equal('control-center-open');
    });

    it('renders "Forget history"', function () {
      const forgetSelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-forget-history"]';
      expect(subject.query(forgetSelector)).to.exist;
      expect(subject.query(forgetSelector).textContent.trim()).to.equal('control-center-forget-history');
    });

    it('renders button "Open" for "Forget history"', function () {
      const buttonSelector = '.accordion #accordion-3 .bullet [data-open-url="forget_history"]';
      expect(subject.query(buttonSelector)).to.exist;
      expect(subject.query(buttonSelector).textContent.trim()).to.equal('control-center-open');
    });
  }

  beforeEach(function () {
    return subject.pushData(target, dataAmo);
  });

  it('history section exists', function () {
    expect(subject.query('#othersettings .accordion [data-target="history"]')).to.exist;
  });

  describe('click on the history section', function () {
    beforeEach(function () {
      subject.query('#othersettings .accordion [data-target="history"]').click();
      return waitFor(() => subject.query('.accordion .accordion-section-title[href="#accordion-3"]').classList.contains('active'));
    });

    historySectionTests();
  });
});
