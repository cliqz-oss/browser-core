import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import generateData from './fixtures/myoffrz';

function myOffrzTests(amo) {
  const data = generateData(amo);
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('MyOffrz options section', function () {
    beforeEach(() => {
      return subject.pushData(data);
    });

    it('MyOffrz section exists', function () {
      const sectionSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-4"]';
      chai.expect(subject.query(sectionSelector)).to.exist;
    });

    describe('click on MyOffrz section', function () {
      beforeEach(function () {
        subject.query('#othersettings .accordion .accordion-section-title[href="#accordion-4"]').click();
        return waitFor(() => subject.query('#othersettings .accordion .accordion-section-title[href="#accordion-4"]').classList.contains('active'));
      });

      it('renders "MyOffrz options"', function () {
        const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-4"] [data-i18n="control-center-offers-options"]';
        chai.expect(subject.query(titleSelector)).to.exist;
        chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-offers-options');
      });

      it('renders arrow for MyOffrz options', function () {
        const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-4"] #arrow';
        chai.expect(subject.query(arrowSelector)).to.exist;
      });

      it('renders 2 options', function () {
        chai.expect(subject.queryAll('.accordion #accordion-4 .bullet')).to.not.be.null;
        chai.expect(subject.queryAll('.accordion #accordion-4 .bullet').length).to.equal(2);
      });

      context('"Show MyOffrz" block', function () {
        it('renders "Show MyOffrz"', function () {
          const titleSelector = '#accordion-4 .bullet [data-i18n="control-center-offers-show"]';
          chai.expect(subject.query(titleSelector)).to.exist;
          chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-offers-show');
        });

        it('renders info button', function () {
          const offersObject = subject.queryAll('#accordion-4 .bullet')[0];
          chai.expect(offersObject.querySelector('.infobutton')).to.exist;
        });

        it('renders "Learn more"', function () {
          const offersObject = subject.queryAll('#accordion-4 .bullet')[0];
          chai.expect(offersObject.querySelector('.location-more')).to.exist;
          chai.expect(offersObject.querySelector('.location-more').hasAttribute('data-i18n')).to.be.true;
          chai.expect(offersObject.querySelector('.location-more').getAttribute('data-i18n')).to.equal('control-center-info-share-location-link');
        });

        it('url for "Learn more" is correct', function () {
          const offersObject = subject.queryAll('#accordion-4 .bullet')[0];
          chai.expect(offersObject.querySelector('.location-more').hasAttribute('openurl')).to.be.true;
          chai.expect(offersObject.querySelector('.location-more').getAttribute('openurl')).to.equal('https://cliqz.com/myoffrz');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-4 .bullet .custom-dropdown[data-target="offerz_main"]';
          chai.expect(subject.query(dropdownSelector)).to.exist;
        });

        function myOffrz(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-4 .bullet .custom-dropdown[data-target="offerz_main"]';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="false"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent("HTMLEvents");
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.message.action === "updatePref")
            ).then(
              message => {
                chai.expect(message).to.have.deep.property("message.data.pref", "extensions.cliqz.offers2UserEnabled");
                chai.expect(message).to.have.deep.property("message.data.value", `${currentValue}`);
                chai.expect(message).to.have.deep.property("message.data.target", "offerz_main");
                chai.expect(message).to.have.deep.property("message.data.prefType", 'boolean');
              }
            );
          });
        };

        myOffrz('false');
        myOffrz('true');

        it('text for options is correct', function () {
          const enabledSelector = '.accordion #accordion-4 .bullet .custom-dropdown[data-target="offerz_main"] [data-i18n="control-center-enabled"]';
          const disabledSelector = '.accordion #accordion-4 .bullet .custom-dropdown[data-target="offerz_main"] [data-i18n="control-center-disabled"]';
          chai.expect(subject.query(enabledSelector)).to.exist;
          chai.expect(subject.query(enabledSelector).textContent.trim()).to.equal('control-center-enabled');
          chai.expect(subject.query(disabledSelector)).to.exist;
          chai.expect(subject.query(disabledSelector).textContent.trim()).to.equal('control-center-disabled');
        });
      });

      context('"Show local MyOffrz" block', function () {
        it('renders "Show local MyOffrz"', function () {
          const titleSelector = '#accordion-4 .bullet [data-i18n="control-center-offers-location"]';
          chai.expect(subject.query(titleSelector)).to.exist;
          chai.expect(subject.query(titleSelector).textContent.trim()).to.equal('control-center-offers-location');
        });

        it('renders info button', function () {
          const offersObject = subject.queryAll('#accordion-4 .bullet')[1];
          chai.expect(offersObject.querySelector('.infobutton')).to.exist;
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-4 .bullet .custom-dropdown[data-target="offerz_location"]';
          chai.expect(subject.query(dropdownSelector)).to.exist;
        });

        function myLocalOffrz(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-4 .bullet .custom-dropdown[data-target="offerz_location"]';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="0"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent("HTMLEvents");
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.message.action === "updatePref")
            ).then(
              message => {
                chai.expect(message).to.have.deep.property("message.data.pref", "extensions.cliqz.offers_location");
                chai.expect(message).to.have.deep.property("message.data.value", `${currentValue}`);
                chai.expect(message).to.have.deep.property("message.data.target", "offerz_location");
                chai.expect(message).to.have.deep.property("message.data.prefType", 'integer');
              }
            );
          });
        };

        myLocalOffrz('0');
        myLocalOffrz('1');

        it('text for options is correct', function () {
          const enabledSelector = '.accordion #accordion-4 .bullet .custom-dropdown[data-target="offerz_location"] [data-i18n="control-center-enabled"]';
          const disabledSelector = '.accordion #accordion-4 .bullet .custom-dropdown[data-target="offerz_location"] [data-i18n="control-center-disabled"]';
          chai.expect(subject.query(enabledSelector)).to.exist;
          chai.expect(subject.query(enabledSelector).textContent.trim()).to.equal('control-center-enabled');
          chai.expect(subject.query(disabledSelector)).to.exist;
          chai.expect(subject.query(disabledSelector).textContent.trim()).to.equal('control-center-disabled');
        });
      });
    });
  });
};

describe('Control Center: MyOffrz options browser', function () {
  myOffrzTests(false);

});

describe('Control Center: AMO, MyOffrz options tests', function () {
  myOffrzTests(true);
})
