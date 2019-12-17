/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
      const sectionSelector = '#othersettings .accordion .accordion-section-title[data-target="offrz"]';
      expect(subject.query(sectionSelector)).to.exist;
    });

    describe('click on MyOffrz section', function () {
      beforeEach(function () {
        subject.query('#othersettings .accordion .accordion-section-title[data-target="offrz"]').click();
        return waitFor(() => subject.query('#othersettings .accordion .accordion-section-title[data-target="offrz"]').classList.contains('open'));
      });

      it('renders "MyOffrz options"', function () {
        const titleSelector = '#othersettings .accordion .accordion-section-title[data-target="offrz"] span';
        expect(subject.query(titleSelector)).to.exist;
        expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_offers_options');
      });

      it('renders arrow for MyOffrz options', function () {
        const arrowSelector = '#othersettings .accordion .accordion-section-title[data-target="offrz"] #arrow';
        expect(subject.query(arrowSelector)).to.exist;
      });

      it('renders 1 option', function () {
        expect(subject.queryAll('.accordion #accordion-4 .bullet')).to.not.be.null;
        expect(subject.queryAll('.accordion #accordion-4 .bullet').length).to.equal(1);
      });

      context('"Show MyOffrz" block', function () {
        it('renders "Show MyOffrz"', function () {
          const titleSelector = '#accordion-4 .bullet > span';
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
          expect(offersObject.querySelector('.location-more').textContent.trim()).to.equal('control_center_info_share_location_link');
        });

        it('url for "Learn more" is correct', function () {
          const offersObject = subject.queryAll('#accordion-4 .bullet')[0];
          expect(offersObject.querySelector('.location-more').getAttribute('target')).to.equal('https://cliqz.com/myoffrz');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-4 .bullet .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        function myOffrz(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-4 .bullet .custom-dropdown';
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
                expect(message).to.have.nested.property('args[0].pref', 'offers2UserEnabled');
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
          const enabledSelector = '.accordion #accordion-4 .bullet .custom-dropdown option[value="true"]';
          const disabledSelector = '.accordion #accordion-4 .bullet .custom-dropdown option[value="false"]';
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
