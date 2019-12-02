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
import { generateDataOn, generateDataOffSite, generateDataOffAll } from './fixtures/antitracking';

function antitrackingUiTests(amo) {
  const dataOn = generateDataOn(amo);
  const dataOffSite = generateDataOffSite(amo);
  const dataOffAll = generateDataOffAll(amo);
  const target = 'control-center';
  let subject;

  before(function () {
    subject = new Subject();
  });

  after(function () {
    subject.unload();
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

  function antiTrackingUiTests() {
    it('renders antitracking box', function () {
      expect(subject.query('#anti-tracking')).to.not.be.null;
    });

    it('renders info button', function () {
      expect(subject.query('#anti-tracking .title .cc-tooltip')).to.exist;
    });

    it('renders title', function () {
      expect(subject.query('#anti-tracking .title span.hover-highlighted')).to.exist;
      expect(subject.query('#anti-tracking .title span.hover-highlighted').textContent.trim()).to.equal('Anti-Tracking');
    });

    it('renders arrow', function () {
      expect(subject.query('#anti-tracking .title .arrow')).to.exist;
    });

    it('renders switch', function () {
      expect(subject.query('#anti-tracking .title .switches .cqz-switch-box')).to.exist;
    });

    it('renders shield', function () {
      expect(subject.query('#anti-tracking #antitracker-counter #shield')).to.exist;
    });
  }

  describe('anti-tracking on', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOn
      });
      return subject.load();
    });
    headerProtected();
    antiTrackingUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#anti-tracking .cqz-switch-box')).background).to.contain('rgb(0, 173, 239)');
    });

    it('renders "ON"', function () {
      expect(subject.query('#anti-tracking .switches [value="on"]')).to.exist;
      expect(subject.query('#anti-tracking .switches [value="off"]')).to.not.exist;
      expect(subject.query('#anti-tracking .switches [value="on"]').textContent.trim()).to.equal('control_center_switch_on');
    });

    it('renders text about private points', function () {
      expect(subject.query('#anti-tracking .row-text .description')).to.exist;
      expect(subject.query('#anti-tracking .row-text .description').textContent.trim()).to.equal('control_center_datapoints');
    });

    it('dropdown is invisible', function () {
      expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn')).to.not.exist;
    });

    it('renders correct amount of data points', function () {
      expect(subject.query('#anti-tracking #antitracker-counter #count span')).to.exist;
      expect(subject.query('#anti-tracking #antitracker-counter #count span').textContent.trim()).to.equal(dataOn.module.antitracking.totalCount.toString());
    });
  });

  describe('anti-tracking off for the particular website', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffSite
      });
      return subject.load();
    });

    context('control center header', function () {
      it('renders header', function () {
        expect(subject.query('#header')).to.exist;
      });

      it('renders cliqz logo', function () {
        expect(subject.query('#header .pause img')).to.exist;
        expect(subject.query('#header .pause img').getAttribute('src')).to.equal('./images/cliqz.svg');
      });

      it('renders header with the correct text', function () {
        expect(subject.query('#header .title')).to.exist;
        expect(subject.query('#header .title #warning')).to.exist;
        expect(subject.query('#header .title #noWarning')).to.not.exist;
        expect(subject.query('#header .title #warning').textContent.trim()).to.equal('control_center_txt_header_not');
      });

      it('renders warning icon', function () {
        expect(subject.query('#header .title img')).to.exist;
        expect(subject.query('#header .title img').getAttribute('src')).to.equal('./images/alert-privacy.svg');
      });
    });

    antiTrackingUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#anti-tracking .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      expect(subject.query('#anti-tracking .switches [value="off"]')).to.exist;
      expect(subject.query('#anti-tracking .switches [value="on"]')).to.not.exist;
      expect(subject.query('#anti-tracking .switches [value="off"]').textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders "Turned off for this domain"', function () {
      expect(subject.query('#anti-tracking .row-text .description')).to.exist;
      expect(subject.query('#anti-tracking .row-text .description').textContent.trim()).to.equal('control_center_datapoints_inactive');
    });

    it('renders dropdown with "This domain"', function () {
      expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn .dropdown-content-option-text')).to.exist;
      expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn .dropdown-content-option-text').textContent.trim()).to.equal('control_center_this_domain');
    });

    it('renders correct amount of data points', function () {
      expect(subject.query('#anti-tracking #antitracker-counter #count span')).to.exist;
      expect(subject.query('#anti-tracking #antitracker-counter #count span').textContent.trim()).to.equal('0');
    });
  });

  describe('anti-tracking off for all websites', function () {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffAll
      });
      return subject.load();
    });

    context('control center header', function () {
      it('renders header', function () {
        expect(subject.query('#header')).to.exist;
      });

      it('renders cliqz logo', function () {
        expect(subject.query('#header .pause img')).to.exist;
        expect(subject.query('#header .pause img').getAttribute('src')).to.equal('./images/cliqz.svg');
      });

      it('renders header with the correct text', function () {
        expect(subject.query('#header .title')).to.exist;
        expect(subject.query('#header .title #warning')).to.exist;
        expect(subject.query('#header .title #noWarning')).to.not.exist;
        expect(subject.query('#header .title #warning').textContent.trim()).to.equal('control_center_txt_header_not');
      });

      it('renders warning icon', function () {
        expect(subject.query('#header .title img')).to.exist;
        expect(subject.query('#header .title img').getAttribute('src')).to.equal('./images/alert-privacy.svg');
      });
    });

    antiTrackingUiTests();

    it('renders correct colour of switch', function () {
      expect(subject.getComputedStyle(subject.query('#anti-tracking .cqz-switch-box')).background).to.contain('rgb(255, 126, 116)');
    });

    it('renders "OFF"', function () {
      expect(subject.query('#anti-tracking .switches [value="off"]')).to.exist;
      expect(subject.query('#anti-tracking .switches [value="on"]')).to.not.exist;
      expect(subject.query('#anti-tracking .switches [value="off"]').textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders "Turned off for all websites"', function () {
      expect(subject.query('#anti-tracking .row-text .description')).to.exist;
      expect(subject.query('#anti-tracking .row-text .description').textContent.trim()).to.equal('control_center_datapoints_off');
    });

    it('renders dropdown with "All websites"', function () {
      expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn .dropdown-content-option-text')).to.exist;
      expect(subject.query('#anti-tracking .new-dropdown .dropdown-btn .dropdown-content-option-text').textContent.trim()).to.equal('control_center_all_sites');
    });

    it('renders correct amount of data points', function () {
      expect(subject.query('#anti-tracking #antitracker-counter #count span')).to.exist;
      expect(subject.query('#anti-tracking #antitracker-counter #count span').textContent.trim()).to.equal('0');
    });
  });
}

describe('Control Center: Anti-Tracking UI browser', function () {
  antitrackingUiTests(false);
});

describe('Control Center: AMO, Anti-Tracking UI tests', function () {
  antitrackingUiTests(true);
});
