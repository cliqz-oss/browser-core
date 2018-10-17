/* global document */

import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import generateData from './fixtures/myoffrz';

function myOffrzTests(amo) {
  const data = generateData(amo);
  const target = 'control-center';
  let subject;

  beforeEach(function () {
    subject = new Subject();
    subject.respondsWith({
      module: target,
      action: 'getData',
      response: data
    });
    return subject.load();
  });

  afterEach(function () {
    subject.unload();
  });

  it('loads', function () {
    expect(true).to.eql(true);
  });

  describe('MyOffrz options section', function () {
    it('MyOffrz section exists', function () {
      const sectionSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-4"]';
      expect(subject.query(sectionSelector)).to.exist;
    });

    describe('click on MyOffrz section', function () {
      beforeEach(function () {
        subject.query('#othersettings .accordion .accordion-section-title[href="#accordion-4"]').click();
        return waitFor(() => subject.query('#othersettings .accordion .accordion-section-title[href="#accordion-4"]').classList.contains('active'));
      });

      it('renders "MyOffrz options"', function () {
        const titleSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-4"] [data-i18n="control_center_offers_options"]';
        expect(subject.query(titleSelector)).to.exist;
        expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_offers_options');
      });

      it('renders arrow for MyOffrz options', function () {
        const arrowSelector = '#othersettings .accordion .accordion-section-title[href="#accordion-4"] #arrow';
        expect(subject.query(arrowSelector)).to.exist;
      });

      it('renders 2 options', function () {
        expect(subject.queryAll('.accordion #accordion-4 .bullet')).to.not.be.null;
        expect(subject.queryAll('.accordion #accordion-4 .bullet').length).to.equal(2);
      });

      context('"Show MyOffrz" block', function () {
        it('renders "Show MyOffrz"', function () {
          const titleSelector = '#accordion-4 .bullet [data-i18n="control_center_offers_show"]';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_offers_show');
        });

        it('renders info button', function () {
          const offersObject = subject.queryAll('#accordion-4 .bullet')[0];
          expect(offersObject.querySelector('.cc-tooltip')).to.exist;
        });

        it('renders "Learn more"', function () {
          const offersObject = subject.queryAll('#accordion-4 .bullet')[0];
          expect(offersObject.querySelector('.location-more')).to.exist;
          expect(offersObject.querySelector('.location-more').hasAttribute('data-i18n')).to.be.true;
          expect(offersObject.querySelector('.location-more').getAttribute('data-i18n')).to.equal('control_center_info_share_location_link');
        });

        it('url for "Learn more" is correct', function () {
          const offersObject = subject.queryAll('#accordion-4 .bullet')[0];
          expect(offersObject.querySelector('.location-more').hasAttribute('data-open-url')).to.be.true;
          expect(offersObject.querySelector('.location-more').getAttribute('data-open-url')).to.equal('https://cliqz.com/myoffrz');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-4 .bullet .custom-dropdown[data-target="offerz_main"]';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        function myOffrz(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-4 .bullet .custom-dropdown[data-target="offerz_main"]';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="false"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'updatePref')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].pref', 'extensions.cliqz.offers2UserEnabled');
                expect(message).to.have.nested.property('args[0].value', `${currentValue}`);
                expect(message).to.have.nested.property('args[0].target', 'offerz_main');
                expect(message).to.have.nested.property('args[0].prefType', 'boolean');
              }
            );
          });
        }

        myOffrz('false');
        myOffrz('true');

        it('text for options is correct', function () {
          const enabledSelector = '.accordion #accordion-4 .bullet .custom-dropdown[data-target="offerz_main"] [data-i18n="control_center_enabled"]';
          const disabledSelector = '.accordion #accordion-4 .bullet .custom-dropdown[data-target="offerz_main"] [data-i18n="control_center_disabled"]';
          expect(subject.query(enabledSelector)).to.exist;
          expect(subject.query(enabledSelector).textContent.trim()).to.equal('control_center_enabled');
          expect(subject.query(disabledSelector)).to.exist;
          expect(subject.query(disabledSelector).textContent.trim()).to.equal('control_center_disabled');
        });
      });

      context('"Show local MyOffrz" block', function () {
        it('renders "Show local MyOffrz"', function () {
          const titleSelector = '#accordion-4 .bullet [data-i18n="control_center_offers_location"]';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_offers_location');
        });

        it('renders info button', function () {
          const offersObject = subject.queryAll('#accordion-4 .bullet')[1];
          expect(offersObject.querySelector('.cc-tooltip')).to.exist;
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-4 .bullet .custom-dropdown[data-target="offerz_location"]';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        function myLocalOffrz(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-4 .bullet .custom-dropdown[data-target="offerz_location"]';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="0"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'updatePref')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].pref', 'extensions.cliqz.offers_location');
                expect(message).to.have.nested.property('args[0].value', `${currentValue}`);
                expect(message).to.have.nested.property('args[0].target', 'offerz_location');
                expect(message).to.have.nested.property('args[0].prefType', 'integer');
              }
            );
          });
        }

        myLocalOffrz('0');
        myLocalOffrz('1');

        it('text for options is correct', function () {
          const enabledSelector = '.accordion #accordion-4 .bullet .custom-dropdown[data-target="offerz_location"] [data-i18n="control_center_enabled"]';
          const disabledSelector = '.accordion #accordion-4 .bullet .custom-dropdown[data-target="offerz_location"] [data-i18n="control_center_disabled"]';
          expect(subject.query(enabledSelector)).to.exist;
          expect(subject.query(enabledSelector).textContent.trim()).to.equal('control_center_enabled');
          expect(subject.query(disabledSelector)).to.exist;
          expect(subject.query(disabledSelector).textContent.trim()).to.equal('control_center_disabled');
        });
      });
    });
  });
}

describe('Control Center: MyOffrz options browser', function () {
  myOffrzTests(false);
});

describe('Control Center: AMO, MyOffrz options tests', function () {
  myOffrzTests(true);
});
