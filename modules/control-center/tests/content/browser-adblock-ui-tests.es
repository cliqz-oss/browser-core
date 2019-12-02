/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  expect,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataOn, dataOffSite, dataOffAll } from './fixtures/adblocker';

describe('Control Center: Ad-Block UI browser', function () {
  let subject;
  const target = 'control-center';

  before(function () {
    subject = new Subject();
  });

  function headerProtected() {
    context('control center header', function () {
      it('renders header', function () {
        expect(subject.query('#header')).to.exist;
      });

      it('renders cliqz logo', function () {
        expect(subject.query('#header .pause img')).to.exist;
        expect(subject.query('#header .pause img').getAttribute('src')).to.equal('./images/cliqz.svg');
      });

      it('renders "Your data is protected"', function () {
        expect(subject.query('#header .title #noWarning')).to.exist;
        expect(subject.query('#header .title #noWarning').textContent.trim()).to.equal('control_center_txt_header');
      });

      it('doesn\'t render warning icon', function () {
        expect(subject.query('#header .title img')).to.not.exist;
      });
    });
  }

  function adBlockerUiTests() {
    it('renders ad-blocker box', function () {
      expect(subject.query('#ad-blocking')).to.not.be.null;
    });

    it('renders info button', function () {
      expect(subject.query('#ad-blocking .title .cc-tooltip')).to.exist;
    });

    it('renders title', function () {
      const titleSelector = '#ad-blocking .title [data-tooltip-content="#ad-blocking-tooltip"]';
      expect(subject.query(titleSelector)).to.exist;
      expect(subject.query(titleSelector).textContent.trim()).to.equal('control_center_adblock_title');
    });

    it('renders arrow', function () {
      expect(subject.query('#ad-blocking .title .arrow')).to.exist;
    });

    it('renders switch', function () {
      expect(subject.query('#ad-blocking .title .switches .cqz-switch-box')).to.exist;
    });

    it('renders ad-block icon', function () {
      expect(subject.query('#ad-blocking .settings-section-row .counter #block')).to.exist;
    });
  }

  it('loads', function () {
    expect(true).to.eql(true);
  });

  describe('ad-blocker on', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOn
      });
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    headerProtected();
    adBlockerUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#ad-blocking .cqz-switch-box')).background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      const onSelector = '#ad-blocking .switches [value="on"]';
      expect(subject.query(onSelector)).to.exist;
      expect(subject.query(onSelector).textContent.trim()).to.equal('control_center_switch_on');
    });

    it('renders text about ads', function () {
      const onSelector = '#ad-blocking .row-text [value="active"]';
      expect(subject.query(onSelector)).to.exist;
    });

    it('dropdown is invisible', function () {
      const dropdownSelector = '#ad-blocking .new-dropdown .dropdown-btn';
      expect(subject.query(dropdownSelector)).to.not.exist;
    });

    it('renders correct amount of blocked ads', function () {
      const adsNumberSelector = '#ad-blocking .counter #count';
      const adsNumberActiveSelector = `${adsNumberSelector} [data-visible-on-state="active"]`;
      const adsNumberOffSelector = `${adsNumberSelector} [data-visible-on-state="off"]`;
      expect(subject.query(adsNumberSelector)).to.exist;
      expect(subject.query(adsNumberActiveSelector)).to.exist;
      expect(subject.query(adsNumberOffSelector)).to.exist;
      expect(subject.query(adsNumberActiveSelector).textContent.trim())
        .to.equal(dataOn.module.adblocker.totalCount.toString());
    });
  });

  describe('ad-blocker off for the particular domain', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffSite
      });
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    headerProtected();
    adBlockerUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#ad-blocking .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      const onSelector = '#ad-blocking .switches [value="on"]';
      const offSelector = '#ad-blocking .switches [value="off"]';
      expect(subject.query(onSelector)).to.not.exist;
      expect(subject.query(offSelector)).to.exist;
      expect(subject.query(offSelector).textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders text about ads', function () {
      const domainSelector = '#ad-blocking .row-text .description';
      expect(subject.query(domainSelector)).to.exist;
      expect(subject.query(domainSelector).textContent.trim()).to.equal('control_center_adblock_description_off_domain');
    });

    it('dropdown is visible', function () {
      const dropdownSelector = '#ad-blocking .new-dropdown .dropdown-btn';
      expect(subject.query(dropdownSelector)).to.exist;
    });

    it('renders correct text in dropdown', function () {
      const domainSelector = '#ad-blocking .new-dropdown .dropdown-content-option[value="off_domain"]';
      const allSelector = '#ad-blocking .new-dropdown .dropdown-content-option[value="off_all"]';
      expect(subject.query(domainSelector)).to.exist;
      expect(subject.query(allSelector)).to.exist;
      expect(subject.query(domainSelector).textContent.trim()).to.equal('control_center_this_domain');
    });

    it('renders correct amount of blocked ads', function () {
      const adsNumberSelector = '#ad-blocking .counter #count';
      const adsNumberActiveSelector = `${adsNumberSelector} [data-visible-on-state="active"]`;
      const adsNumberOffSelector = `${adsNumberSelector} [data-visible-on-state="off"]`;
      expect(subject.query(adsNumberSelector)).to.exist;
      expect(subject.query(adsNumberActiveSelector)).to.exist;
      expect(subject.query(adsNumberOffSelector)).to.exist;
      expect(subject.query(adsNumberOffSelector).textContent.trim()).to.equal('0');
    });
  });

  describe('ad-blocker off for all websites', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffAll
      });
      return subject.load();
    });

    after(function () {
      subject.unload();
    });

    headerProtected();
    adBlockerUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#ad-blocking .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      const onSelector = '#ad-blocking .switches [value="on"]';
      const offSelector = '#ad-blocking .switches [value="off"]';
      expect(subject.query(onSelector)).to.not.exist;
      expect(subject.query(offSelector)).to.exist;
      expect(subject.query(offSelector).textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders text about ads', function () {
      const allSelector = '#ad-blocking .row-text .description';
      expect(subject.query(allSelector)).to.exist;
      expect(subject.query(allSelector).textContent.trim()).to.equal('control_center_adblock_description_off_all');
    });

    it('dropdown is visible', function () {
      const dropdownSelector = '#ad-blocking .new-dropdown .dropdown-btn';
      expect(subject.query(dropdownSelector)).to.exist;
    });

    it('renders correct text in dropdown', function () {
      const domainSelector = '#ad-blocking .new-dropdown .dropdown-content-option[value="off_domain"]';
      const allSelector = '#ad-blocking .new-dropdown .dropdown-content-option[value="off_all"]';
      expect(subject.query(domainSelector)).to.exist;
      expect(subject.query(allSelector)).to.exist;
      expect(subject.query(allSelector).textContent.trim()).to.equal('control_center_all_sites');
    });

    it('renders correct amount of blocked ads', function () {
      const adsNumberSelector = '#ad-blocking .counter #count';
      const adsNumberActiveSelector = `${adsNumberSelector} [data-visible-on-state="active"]`;
      const adsNumberOffSelector = `${adsNumberSelector} [data-visible-on-state="off"]`;
      expect(subject.query(adsNumberSelector)).to.exist;
      expect(subject.query(adsNumberActiveSelector)).to.exist;
      expect(subject.query(adsNumberOffSelector)).to.exist;
      expect(subject.query(adsNumberOffSelector).textContent.trim()).to.equal('0');
    });
  });
});
