import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import {dataOn, dataOff, dataAmo} from './fixtures/history-section';

describe('Control Center: History options browser', function () {
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  function historySectionTests() {
    it('history section appeared', function () {
      chai.expect(subject.query('.accordion #accordion-3.accordion-section-content.open')).to.exist;
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

    it('renders three options', function () {
      chai.expect(subject.queryAll('.accordion #accordion-3 .bullet').length).to.equal(3);
    });

    it('renders "Show all history"', function () {
      const historySelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-show-history"]';
      chai.expect(subject.query(historySelector)).to.exist;
      chai.expect(subject.query(historySelector).textContent.trim()).to.equal('control-center-show-history');
    });

    it('renders button "Open" for "Show all history"', function () {
      const buttonSelector = '.accordion #accordion-3 .bullet [data-open-url="history"]';
      chai.expect(subject.query(buttonSelector)).to.exist;
      chai.expect(subject.query(buttonSelector).textContent.trim()).to.equal('control-center-open');
    });

    it('renders "Forget history"', function () {
      const forgetSelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-forget-history"]';
      chai.expect(subject.query(forgetSelector)).to.exist;
      chai.expect(subject.query(forgetSelector).textContent.trim()).to.equal('control-center-forget-history');
    });

    it('renders button "Open" for "Forget history"', function () {
      const buttonSelector = '.accordion #accordion-3 .bullet [data-open-url="forget_history"]';
      chai.expect(subject.query(buttonSelector)).to.exist;
      chai.expect(subject.query(buttonSelector).textContent.trim()).to.equal('control-center-open');
    });

    it('renders dropdown for autoforget mode', function () {
      chai.expect(subject.query('.accordion #accordion-3 .bullet .custom-dropdown')).to.exist;
    });
  }

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('with autoforget mode on', function () {
    beforeEach(() => {
      return subject.pushData(dataOn);
    });

    it('history section exists', function () {
      chai.expect(subject.query('#othersettings .accordion [data-target="history"]')).to.exist;
    });

    describe('click on the history section', function () {
      beforeEach(function () {
        subject.query('#othersettings .accordion [data-target="history"]').click();
        return waitFor(() => subject.query('.accordion .accordion-section-title[href="#accordion-3"]').classList.contains('active'));
      });

      historySectionTests();

      it('renders "Automatic forget mode"', function () {
        const modeSelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-forget-mode"]';
        chai.expect(subject.query(modeSelector)).to.exist;
        chai.expect(subject.query(modeSelector).textContent.trim()).to.equal('control-center-forget-mode');
      });

      it('renders info button', function () {
        chai.expect(subject.query('.accordion #accordion-3 .bullet .infobutton')).to.exist;
      });


      it("Automatic forget mode is on", function () {
        const select = subject.query('.accordion #accordion-3 .bullet .custom-dropdown');
        const evt = document.createEvent("HTMLEvents");
        select.addEventListener('change', console.log);
        evt.initEvent('change', true, true);
        select.dispatchEvent(evt);
        return waitFor(
          () => subject.messages.find(message => message.message.action === "updatePref")
        ).then(
          message => {
            chai.expect(message).to.have.nested.property("message.data.pref", "browser.privatebrowsing.apt");
            chai.expect(message).to.have.nested.property("message.data.value", "true");
            chai.expect(message).to.have.nested.property("message.data.target", "history_autoforget");
            chai.expect(message).to.have.nested.property("message.data.prefType", "boolean");
          }
        );
      });
    });
  });

  describe('with autoforget mode off', function () {
    beforeEach(() => {
      return subject.pushData(dataOff);
    });

    it('history section exists', function () {
      chai.expect(subject.query('#othersettings .accordion [data-target="history"]')).to.exist;
    });

    describe('click on the history section', function () {
      beforeEach(function () {
        subject.query('#othersettings .accordion [data-target="history"]').click();
        return waitFor(() => subject.query('.accordion .accordion-section-title[href="#accordion-3"]').classList.contains('active'));
      });

      historySectionTests();

      it('renders "Automatic forget mode"', function () {
        const modeSelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-forget-mode"]';
        chai.expect(subject.query(modeSelector)).to.exist;
        chai.expect(subject.query(modeSelector).textContent.trim()).to.equal('control-center-forget-mode');
      });

      it('renders info button', function () {
        chai.expect(subject.query('.accordion #accordion-3 .bullet .infobutton')).to.exist;
      });

      it("Automatic forget mode is off", function () {
        const select = subject.query('.accordion #accordion-3 .bullet .custom-dropdown');
        const evt = document.createEvent("HTMLEvents");
        select.addEventListener('change', console.log);
        evt.initEvent('change', true, true);
        select.dispatchEvent(evt);
        return waitFor(
          () => subject.messages.find(message => message.message.action === "updatePref")
        ).then(
          message => {
            chai.expect(message).to.have.nested.property("message.data.pref", "browser.privatebrowsing.apt");
            chai.expect(message).to.have.nested.property("message.data.value", "false");
            chai.expect(message).to.have.nested.property("message.data.target", "history_autoforget");
            chai.expect(message).to.have.nested.property("message.data.prefType", "boolean");
          }
        );
      });
    });
  });
});

describe('Control Center: AMO, History options tests', function () {
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  function historySectionTests() {
    it('history section appeared', function () {
      chai.expect(subject.query('.accordion #accordion-3.accordion-section-content.open')).to.exist;
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

    it('renders two options', function () {
      chai.expect(subject.queryAll('.accordion #accordion-3 .bullet').length).to.equal(2);
    });

    it('renders "Show all history"', function () {
      const historySelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-show-history"]';
      chai.expect(subject.query(historySelector)).to.exist;
      chai.expect(subject.query(historySelector).textContent.trim()).to.equal('control-center-show-history');
    });

    it('renders button "Open" for "Show all history"', function () {
      const buttonSelector = '.accordion #accordion-3 .bullet [data-open-url="history"]';
      chai.expect(subject.query(buttonSelector)).to.exist;
      chai.expect(subject.query(buttonSelector).textContent.trim()).to.equal('control-center-open');
    });

    it('renders "Forget history"', function () {
      const forgetSelector = '.accordion #accordion-3 .bullet [data-i18n="control-center-forget-history"]';
      chai.expect(subject.query(forgetSelector)).to.exist;
      chai.expect(subject.query(forgetSelector).textContent.trim()).to.equal('control-center-forget-history');
    });

    it('renders button "Open" for "Forget history"', function () {
      const buttonSelector = '.accordion #accordion-3 .bullet [data-open-url="forget_history"]';
      chai.expect(subject.query(buttonSelector)).to.exist;
      chai.expect(subject.query(buttonSelector).textContent.trim()).to.equal('control-center-open');
    });
  };

  beforeEach(() => {
    return subject.pushData(dataAmo);
  });

  it('history section exists', function () {
    chai.expect(subject.query('#othersettings .accordion [data-target="history"]')).to.exist;
  });

  describe('click on the history section', function () {
    beforeEach(function () {
      subject.query('#othersettings .accordion [data-target="history"]').click();
      return waitFor(() => subject.query('.accordion .accordion-section-title[href="#accordion-3"]').classList.contains('active'));
    });

    historySectionTests();
  });
})
