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
import { generateDataOn, generateDataOffSite, generateDataOffAll } from './fixtures/antiphishing';

function antiphishingUiTests(amo) {
  const dataOn = generateDataOn(amo);
  const dataOffSite = generateDataOffSite(amo);
  const dataOffAll = generateDataOffAll(amo);
  const target = 'control-center';
  let subject;

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
        expect(subject.query('#header .title #warning')).to.not.exist;
        expect(subject.query('#header .title #noWarning').textContent.trim()).to.equal('control_center_txt_header');
      });

      it('doesn\'t render warning icon', function () {
        expect(subject.query('#header .title img')).to.not.exist;
      });
    });
  }

  function antiPhishingUiTests() {
    it('renders antiphishing box', function () {
      expect(subject.query('#anti-phishing')).to.not.be.null;
    });

    it('renders info button', function () {
      expect(subject.query('#anti-phishing .title .cc-tooltip')).to.exist;
    });

    it('renders title', function () {
      expect(subject.query('#anti-phishing .title [data-tooltip-content="#anti-phishing-tooltip"]')).to.exist;
      expect(subject.query('#anti-phishing .title [data-tooltip-content="#anti-phishing-tooltip"]').textContent.trim()).to.equal('Anti-Phishing');
    });

    it('renders switch', function () {
      expect(subject.query('#anti-phishing .title .switches .cqz-switch-box')).to.exist;
    });
  }

  describe('anti-phishing on', function () {
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
    antiPhishingUiTests();

    it('dropdown is invisible', function () {
      expect(subject.query('#anti-phishing .new-dropdown .dropdown-btn')).to.not.exist;
    });

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#anti-phishing .switches .cqz-switch-box')).background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      expect(subject.query('#anti-phishing .switches [value="on"]')).to.exist;
      expect(subject.query('#anti-phishing .switches [value="off"]')).to.not.exist;
      expect(subject.query('#anti-phishing .switches [value="on"]').textContent.trim()).to.equal('control_center_switch_on');
    });
  });

  describe('anti-phishing off for particular domain', function () {
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
    antiPhishingUiTests();

    it('dropdown is visible', function () {
      expect(subject.query('#anti-phishing .new-dropdown .dropdown-btn')).to.exist;
    });

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#anti-phishing .switches .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      expect(subject.query('#anti-phishing .switches [value="on"]')).to.not.exist;
      expect(subject.query('#anti-phishing .switches [value="off"]')).to.exist;
      expect(subject.query('#anti-phishing .switches [value="off"]').textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders dropdown with "This domain"', function () {
      expect(subject.query('#anti-phishing .new-dropdown .dropdown-btn .dropdown-content-option-text')).to.exist;
      expect(subject.query('#anti-phishing .new-dropdown .dropdown-btn .dropdown-content-option-text').textContent.trim()).to.equal('control_center_this_domain');
    });
  });

  describe('anti-phishing off for all websites', function () {
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
    antiPhishingUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#anti-phishing .switches .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      expect(subject.query('#anti-phishing .switches [value="on"]')).to.not.exist;
      expect(subject.query('#anti-phishing .switches [value="off"]')).to.exist;
      expect(subject.query('#anti-phishing .switches [value="off"]').textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders dropdown with "All websites"', function () {
      expect(subject.query('#anti-phishing .new-dropdown .dropdown-btn .dropdown-content-option-text')).to.exist;
      expect(subject.query('#anti-phishing .new-dropdown .dropdown-btn .dropdown-content-option-text').textContent.trim()).to.equal('control_center_all_sites');
    });
  });
}

describe('Control Center: Anti-Phishing UI browser', function () {
  antiphishingUiTests(false);
});

describe('Control Center: AMO, Anti-Phishing UI tests', function () {
  antiphishingUiTests(true);
});
