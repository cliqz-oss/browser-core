/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { expect, waitFor } from '../../core/test-helpers';
import console from '../../../core/console';
import config from '../../../core/config';
import { data, dataAmo } from './fixtures/search-section';
import Subject from './local-helpers';

const target = 'control-center';

describe('Search options UI browser', function () {
  let subject;

  beforeEach(function () {
    subject = new Subject();
  });

  afterEach(function () {
    subject.unload();
  });

  describe('Search options section', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: data
      });
      return subject.load({
        buildUrl: `/build/${config.settings.id}/chrome/content/control-center/index.html?pageAction=false`
      });
    });

    it('exists', function () {
      const sectionSelector = '#othersettings .accordion .accordion-section-title.search';
      expect(subject.query(sectionSelector)).to.exist;
    });

    describe('click on the search section', function () {
      beforeEach(function () {
        subject.query('#othersettings .accordion .accordion-section-title.search').click();
        return waitFor(() => subject.query('#othersettings .accordion .accordion-section-title.search').classList.contains('active'));
      });

      it('renders "Search options"', function () {
        const titleSelector = '#othersettings .accordion .accordion-section-title.search span';
        expect(subject.query(titleSelector)).to.exist;
        expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_searchoptions');
      });

      it('renders arrow for search options', function () {
        const arrowSelector = '#othersettings .accordion .accordion-section-title.search #arrow';
        expect(subject.query(arrowSelector)).to.exist;
      });

      it('renders 7 options', function () {
        expect(subject.queryAll('.accordion #accordion-2 .bullet')).to.not.be.null;
        expect(subject.queryAll('.accordion #accordion-2 .bullet').length).to.equal(7);
      });

      context('"Alternative search engine" block', function () {
        it('renders "Alternative search engine"', function () {
          const titleSelector = '#accordion-2 .bullet.defaultSearch span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_search_engine');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.defaultSearch .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        function supplementaryEngines(currentValue) {
          it(`changed to engine ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.defaultSearch .custom-dropdown';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="Google"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'complementary-search')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].defaultSearch', currentValue);
              }
            );
          });
        }

        for (let i = 0; i < data.module.search.state.length; i += 1) {
          const value = data.module.search.state[i].name;
          supplementaryEngines(value);
        }
      });

      context('"Block adult websites" block', function () {
        it('renders "Block adult websites"', function () {
          const titleSelector = '#accordion-2 .bullet.adultStatus > span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_explicit');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.adultStatus.adultStatus .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const explicitObject = subject.queryAll('#accordion-2 .bullet')[1];
          expect(explicitObject.querySelector('.cc-tooltip')).to.exist;
        });

        function explicitContent(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.adultStatus .custom-dropdown';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="moderate"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'updatePref')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].pref', 'adultContentFilter');
                expect(message).to.have.nested.property('args[0].value', `${currentValue}`);
                expect(message).to.have.nested.property('args[0].target', 'search_adult');
              }
            );
          });

          it(`renders "${data.module.adult.state[currentValue].name}"`, function () {
            const optionSelector = `.accordion #accordion-2 .bullet.adultStatus .custom-dropdown option[value="${currentValue}"]`;
            expect(subject.query(optionSelector).textContent.trim())
              .to.equal(data.module.adult.state[currentValue].name);
          });
        }

        explicitContent('conservative');
        explicitContent('moderate');
        explicitContent('liberal');
      });

      context('"Share location" block', function () {
        it('renders "Share location"', function () {
          const titleSelector = '#accordion-2 .bullet.geoEnabled span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_info_share_location_title');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.geoEnabled .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[4];
          expect(locationObject.querySelector('.cc-tooltip')).to.exist;
        });

        it('renders "Learn more"', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[4];
          expect(locationObject.querySelector('.location-more')).to.exist;
        });

        it('url is correct', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[4];
          expect(locationObject.querySelector('.location-more').getAttribute('target')).to.equal('https://cliqz.com/support/local-results');
        });

        function shareLocation(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.geoEnabled .custom-dropdown';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="yes"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'updatePref')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].pref', 'share_location');
                expect(message).to.have.nested.property('args[0].value', `${currentValue}`);
                expect(message).to.have.nested.property('args[0].target', 'search_location');
              }
            );
          });

          it(`renders "${data.module.geolocation.state[currentValue].name}"`, function () {
            const optionSelector = `.accordion #accordion-2 .bullet.geoEnabled .custom-dropdown option[value="${currentValue}"]`;
            expect(subject.query(optionSelector).textContent.trim())
              .to.equal(data.module.geolocation.state[currentValue].name);
          });
        }

        shareLocation('yes');
        shareLocation('ask');
        shareLocation('no');
      });

      context('"Search results for" block', function () {
        it('renders "Search results for"', function () {
          const titleSelector = '#accordion-2 .bullet.defaultCountry span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_backend_country');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.defaultCountry .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        it('does not render info button', function () {
          const explicitObject = subject.queryAll('#accordion-2 .bullet')[2];
          expect(explicitObject.querySelector('.cc-tooltip')).to.be.null;
        });

        function countryBackend(currentValue) {
          it(`changed to country ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.defaultCountry .custom-dropdown';
            const select = subject.query(dropdownSelector);
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'search-index-country')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].defaultCountry', currentValue);
              }
            );
          });

          it(`renders "${data.module.search.supportedIndexCountries[currentValue].name}"`, function () {
            const optionSelector = `.accordion #accordion-2 .bullet.defaultCountry .custom-dropdown option[value="${currentValue}"]`;
            expect(subject.query(optionSelector).textContent.trim())
              .to.equal(data.module.search.supportedIndexCountries[currentValue].name);
          });
        }

        countryBackend('de');
        countryBackend('fr');
        countryBackend('us');
      });

      context('"Search via proxy" block', function () {
        it('renders "Search via proxy"', function () {
          const titleSelector = '#accordion-2 .bullet.searchProxy > span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_proxy');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.searchProxy .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[4];
          expect(locationObject.querySelector('.cc-tooltip')).to.exist;
        });

        function proxy(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.searchProxy .custom-dropdown';
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
                expect(message).to.have.nested.property('args[0].pref', 'hpn-query');
                expect(message).to.have.nested.property('args[0].value', `${currentValue}`);
                expect(message).to.have.nested.property('args[0].target', 'search_proxy');
              }
            );
          });
        }
        proxy('true');
        proxy('false');

        it('text for options is correct', function () {
          const enabledSelector = '.accordion #accordion-2 .bullet.searchProxy .custom-dropdown option[value="true"]';
          const disabledSelector = '.accordion #accordion-2 .bullet.searchProxy .custom-dropdown option[value="false"]';
          expect(subject.query(enabledSelector)).to.exist;
          expect(subject.query(enabledSelector).textContent.trim()).to.equal('control_center_enabled');
          expect(subject.query(disabledSelector)).to.exist;
          expect(subject.query(disabledSelector).textContent.trim()).to.equal('control_center_disabled');
        });
      });

      context('"Human Web" block', function () {
        it('renders "Human Web"', function () {
          const titleSelector = '#accordion-2 .bullet.humanWebOptOut > span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_humanweb');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.humanWebOptOut .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[5];
          expect(locationObject.querySelector('.cc-tooltip')).to.exist;
        });

        function humanWeb(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.humanWebOptOut .custom-dropdown';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="enabled"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'updatePref')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].pref', 'humanWebOptOut');
                expect(message).to.have.nested.property('args[0].value', `${currentValue}`);
                expect(message).to.have.nested.property('args[0].target', 'search_humanweb');
              }
            );
          });
        }
        humanWeb('enabled');
        humanWeb('disabled');

        it('text for options is correct', function () {
          const enabledSelector = '.accordion #accordion-2 .bullet.humanWebOptOut .custom-dropdown option[value="enabled"]';
          const disabledSelector = '.accordion #accordion-2 .bullet.humanWebOptOut .custom-dropdown option[value="disabled"]';
          expect(subject.query(enabledSelector)).to.exist;
          expect(subject.query(enabledSelector).textContent.trim()).to.equal('control_center_enabled');
          expect(subject.query(disabledSelector)).to.exist;
          expect(subject.query(disabledSelector).textContent.trim()).to.equal('control_center_disabled');
        });
      });

      context('"Transparency monitor" block', function () {
        it('renders "Transparency monitor"', function () {
          const titleSelector = '#accordion-2 .bullet.search_transparency span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_transparency');
        });

        it('renders button', function () {
          const buttonSelector = '#accordion-2 .bullet.search_transparency button';
          expect(subject.query(buttonSelector)).to.exist;
        });

        it('url is correct', function () {
          const buttonSelector = '#accordion-2 .bullet.search_transparency button';
          expect(subject.query(buttonSelector).getAttribute('target')).to.equal('about:transparency');
        });

        it('does not render info button', function () {
          const monitorObject = subject.queryAll('#accordion-2 .bullet')[6];
          expect(monitorObject.querySelector('.cc-tooltip')).to.be.null;
        });
      });
    });
  });
});

describe('AMO Search options tests', function () {
  let subject;

  beforeEach(function () {
    subject = new Subject();
  });

  afterEach(function () {
    subject.unload();
  });

  describe('Search options section', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataAmo
      });
      return subject.load({
        buildUrl: `/build/${config.settings.id}/chrome/content/control-center/index.html?pageAction=false`
      });
    });

    it('exists', function () {
      const sectionSelector = '#othersettings .accordion .accordion-section-title.search';
      expect(subject.query(sectionSelector)).to.exist;
    });

    describe('click on the search section', function () {
      beforeEach(function () {
        subject.query('#othersettings .accordion .accordion-section-title.search').click();
        return waitFor(() => subject.query('#othersettings .accordion .accordion-section-title.search').classList.contains('active'));
      });

      it('renders "Search options"', function () {
        const titleSelector = '#othersettings .accordion .accordion-section-title.search span';
        expect(subject.query(titleSelector)).to.exist;
        expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_searchoptions');
      });

      it('renders arrow for search options', function () {
        const arrowSelector = '#othersettings .accordion .accordion-section-title.search #arrow';
        expect(subject.query(arrowSelector)).to.exist;
      });

      it('renders 7 options', function () {
        expect(subject.queryAll('.accordion #accordion-2 .bullet')).to.not.be.null;
        expect(subject.queryAll('.accordion #accordion-2 .bullet').length).to.equal(7);
      });

      context('"Alternative search engine" block', function () {
        it('renders "Alternative search engine"', function () {
          const titleSelector = '#accordion-2 .bullet.defaultSearch span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_search_engine');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.defaultSearch .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        function supplementaryEngines(currentValue) {
          it(`changed to engine ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.defaultSearch .custom-dropdown';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="Google"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'complementary-search')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].defaultSearch', currentValue);
              }
            );
          });
        }

        for (let i = 0; i < dataAmo.module.search.state.length; i += 1) {
          const value = dataAmo.module.search.state[i].name;
          supplementaryEngines(value);
        }
      });

      context('"Block adult websites" block', function () {
        it('renders "Block adult websites"', function () {
          const titleSelector = '#accordion-2 .bullet.adultStatus > span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_explicit');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.adultStatus .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const explicitObject = subject.queryAll('#accordion-2 .bullet')[1];
          expect(explicitObject.querySelector('.cc-tooltip')).to.exist;
        });

        function explicitContent(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.adultStatus .custom-dropdown';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="moderate"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'updatePref')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].pref', 'adultContentFilter');
                expect(message).to.have.nested.property('args[0].value', `${currentValue}`);
                expect(message).to.have.nested.property('args[0].target', 'search_adult');
              }
            );
          });

          it(`renders "${dataAmo.module.adult.state[currentValue].name}"`, function () {
            const optionSelector = `.accordion #accordion-2 .bullet.adultStatus .custom-dropdown option[value="${currentValue}"]`;
            expect(subject.query(optionSelector).textContent.trim())
              .to.equal(dataAmo.module.adult.state[currentValue].name);
          });
        }

        explicitContent('conservative');
        explicitContent('moderate');
        explicitContent('liberal');
      });

      context('"Share location" block', function () {
        it('renders "Share location"', function () {
          const titleSelector = '#accordion-2 .bullet.geoEnabled > span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_location');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.geoEnabled .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[4];
          expect(locationObject.querySelector('.cc-tooltip')).to.exist;
        });

        it('renders "Learn more"', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[4];
          expect(locationObject.querySelector('.location-more')).to.exist;
        });

        it('url is correct', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[4];
          expect(locationObject.querySelector('.location-more').getAttribute('target')).to.equal('https://cliqz.com/support/local-results');
        });

        function shareLocation(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.geoEnabled .custom-dropdown';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="yes"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'updatePref')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].pref', 'share_location');
                expect(message).to.have.nested.property('args[0].value', `${currentValue}`);
                expect(message).to.have.nested.property('args[0].target', 'search_location');
              }
            );
          });

          it(`renders "${dataAmo.module.geolocation.state[currentValue].name}"`, function () {
            const optionSelector = `.accordion #accordion-2 .bullet.geoEnabled .custom-dropdown option[value="${currentValue}"]`;
            expect(subject.query(optionSelector).textContent.trim())
              .to.equal(dataAmo.module.geolocation.state[currentValue].name);
          });
        }

        shareLocation('yes');
        shareLocation('ask');
        shareLocation('no');
      });

      context('"Search results for" block', function () {
        it('renders "Search results for"', function () {
          const titleSelector = '#accordion-2 .bullet.defaultCountry span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_backend_country');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.defaultCountry .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        it('does not render info button', function () {
          const explicitObject = subject.queryAll('#accordion-2 .bullet')[2];
          expect(explicitObject.querySelector('.cc-tooltip')).to.be.null;
        });

        function countryBackend(currentValue) {
          it(`changed to country ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.defaultCountry .custom-dropdown';
            const select = subject.query(dropdownSelector);
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'search-index-country')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].defaultCountry', currentValue);
              }
            );
          });

          it(`renders "${dataAmo.module.search.supportedIndexCountries[currentValue].name}"`, function () {
            const optionSelector = `.accordion #accordion-2 .bullet.defaultCountry .custom-dropdown option[value="${currentValue}"]`;
            expect(subject.query(optionSelector).textContent.trim())
              .to.equal(dataAmo.module.search.supportedIndexCountries[currentValue].name);
          });
        }

        countryBackend('de');
        countryBackend('fr');
        countryBackend('us');
      });

      context('"Search via proxy" block', function () {
        it('renders "Search via proxy"', function () {
          const titleSelector = '#accordion-2 .bullet.searchProxy span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_info_hpn_title');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.searchProxy .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[4];
          expect(locationObject.querySelector('.cc-tooltip')).to.exist;
        });

        function proxy(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.searchProxy .custom-dropdown';
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
                expect(message).to.have.nested.property('args[0].pref', 'hpn-query');
                expect(message).to.have.nested.property('args[0].value', `${currentValue}`);
                expect(message).to.have.nested.property('args[0].prefType', 'boolean');
                expect(message).to.have.nested.property('args[0].target', 'search_proxy');
              }
            );
          });
        }
        proxy('true');
        proxy('false');

        it('text for options is correct', function () {
          const enabledSelector = '.accordion #accordion-2 .bullet.searchProxy .custom-dropdown option[value="true"]';
          const disabledSelector = '.accordion #accordion-2 .bullet.searchProxy .custom-dropdown option[value="false"]';
          expect(subject.query(enabledSelector)).to.exist;
          expect(subject.query(enabledSelector).textContent.trim()).to.equal('control_center_enabled');
          expect(subject.query(disabledSelector)).to.exist;
          expect(subject.query(disabledSelector).textContent.trim()).to.equal('control_center_disabled');
        });
      });

      context('"Human Web" block', function () {
        it('renders "Human Web"', function () {
          const titleSelector = '#accordion-2 .bullet.humanWebOptOut > span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_humanweb');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.humanWebOptOut .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[5];
          expect(locationObject.querySelector('.cc-tooltip')).to.exist;
        });

        function humanWeb(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.humanWebOptOut .custom-dropdown';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="enabled"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'updatePref')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].pref', 'humanWebOptOut');
                expect(message).to.have.nested.property('args[0].value', `${currentValue}`);
                expect(message).to.have.nested.property('args[0].target', 'search_humanweb');
              }
            );
          });
        }
        humanWeb('enabled');
        humanWeb('disabled');

        it('text for options is correct', function () {
          const enabledSelector = '.accordion #accordion-2 .bullet.humanWebOptOut .custom-dropdown option[value="enabled"]';
          const disabledSelector = '.accordion #accordion-2 .bullet.humanWebOptOut .custom-dropdown option[value="disabled"]';
          expect(subject.query(enabledSelector)).to.exist;
          expect(subject.query(enabledSelector).textContent.trim()).to.equal('control_center_enabled');
          expect(subject.query(disabledSelector)).to.exist;
          expect(subject.query(disabledSelector).textContent.trim()).to.equal('control_center_disabled');
        });
      });


      context('"Send usage data" block', function () {
        it('renders "Send usage data"', function () {
          const titleSelector = '#accordion-2 .bullet.telemetry span';
          expect(subject.query(titleSelector)).to.exist;
          expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_telemetry');
        });

        it('renders dropdown', function () {
          const dropdownSelector = '#accordion-2 .bullet.telemetry .custom-dropdown';
          expect(subject.query(dropdownSelector)).to.exist;
        });

        it('renders info button', function () {
          const locationObject = subject.queryAll('#accordion-2 .bullet')[6];
          expect(locationObject.querySelector('.cc-tooltip')).to.exist;
        });

        function usageData(currentValue) {
          it(`changed pref to ${currentValue}`, function () {
            const dropdownSelector = '.accordion #accordion-2 .bullet.telemetry .custom-dropdown';
            const select = subject.query(dropdownSelector);
            select.querySelector('[value="true"]').removeAttribute('selected');
            select.querySelector(`[value="${currentValue}"]`).setAttribute('selected', '');
            const evt = document.createEvent('HTMLEvents');
            select.addEventListener('change', console.log);
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return waitFor(
              () => subject.messages.find(message => message.action === 'updatePref')
            ).then(
              (message) => {
                expect(message).to.have.nested.property('args[0].pref', 'telemetry');
                expect(message).to.have.nested.property('args[0].value', `${currentValue}`);
                expect(message).to.have.nested.property('args[0].target', 'telemetry');
              }
            );
          });
        }
        usageData('true');
        usageData('false');

        it('text for options is correct', function () {
          const enabledSelector = '.accordion #accordion-2 .bullet.telemetry .custom-dropdown option[value="true"]';
          const disabledSelector = '.accordion #accordion-2 .bullet.telemetry .custom-dropdown option[value="false"]';
          expect(subject.query(enabledSelector)).to.exist;
          expect(subject.query(enabledSelector).textContent.trim()).to.equal('control_center_enabled');
          expect(subject.query(disabledSelector)).to.exist;
          expect(subject.query(disabledSelector).textContent.trim()).to.equal('control_center_disabled');
        });
      });
    });
  });
});
