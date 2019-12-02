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
import {
  AUTOCONSENT_INITIAL,
  AUTOCONSENT_ENABLED,
  AUTOCONSENT_DEFAULT_ALLOW,
  AUTOCONSENT_SITE_WHITELISTED,
  AUTOCONSENT_DISABLED,
} from './fixtures/autoconsent';

describe('Control Center: autoconsent UI', () => {
  const target = 'control-center';
  let subject;

  before(function () {
    subject = new Subject();
  });

  after(function () {
    subject.unload();
  });

  function testRenderOffAllSites() {
    it('renders "OFF"', function () {
      expect(subject.query('#autoconsent .switches [value="off"]')).to.exist;
      expect(subject.query('#autoconsent .switches [value="on"]')).to.not.exist;
      expect(subject.query('#autoconsent .switches [value="off"]').textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders "Turned off for all websites"', function () {
      expect(subject.query('#autoconsent .row-text .description')).to.exist;
      expect(subject.query('#autoconsent .row-text .description').textContent.trim()).to.equal('control_center_autoconsent_off');
    });

    it('renders dropdown', function () {
      expect(subject.query('#autoconsent .new-dropdown .dropdown-content-option[value="inactive"]')).to.exist;
      expect(subject.query('#autoconsent .new-dropdown .dropdown-content-option[value="inactive"]').textContent.trim()).to.equal('control_center_this_domain');
      expect(subject.query('#autoconsent .new-dropdown .dropdown-content-option[value="critical"]')).to.exist;
      expect(subject.query('#autoconsent .new-dropdown .dropdown-content-option[value="critical"]').textContent.trim()).to.equal('control_center_all_sites');
    });

    it('shows "All websites" selected', function () {
      expect(subject.query('#autoconsent .new-dropdown .dropdown-btn .dropdown-content-option-text')).to.exist;
      expect(subject.query('#autoconsent .new-dropdown .dropdown-btn .dropdown-content-option-text').textContent.trim()).to.equal('control_center_all_sites');
    });

    it('checkbox is invisible', function () {
      expect(subject.query('#autoconsent #autoconsentDenyCheckbox')).to.not.exist;
    });
  }

  function testRenderOn(deny) {
    it('renders "ON"', function () {
      expect(subject.query('#autoconsent .switches [value="on"]')).to.exist;
      expect(subject.query('#autoconsent .switches [value="off"]')).to.not.exist;
      expect(subject.query('#autoconsent .switches [value="on"]').textContent.trim()).to.equal('control_center_switch_on');
    });

    it('renders "Cookie banners blocked"', function () {
      expect(subject.query('#autoconsent .row-text .description')).to.exist;
      expect(subject.query('#autoconsent .row-text .description').textContent.trim()).to.equal('control_center_autoconsent');
    });

    it('dropdown is invisible', function () {
      expect(subject.query('#autoconsent .new-dropdown .dropdown-btn')).to.not.exist;
    });

    if (deny) {
      it('checkbox is checked', function () {
        expect(subject.query('#autoconsentDenyCheckbox')).to.exist;
        expect(subject.query('#autoconsentDenyCheckbox').checked).to.be.true;
      });
    } else {
      it('checkbox is unchecked', function () {
        expect(subject.getComputedStyle(subject.query('#autoconsentDenyCheckbox')).display).to.not.equal('none');
        expect(subject.query('#autoconsentDenyCheckbox').checked).to.be.false;
      });
    }
  }

  function testRenderOffForSite() {
    it('renders "OFF"', function () {
      expect(subject.query('#autoconsent .switches [value="off"]')).to.exist;
      expect(subject.query('#autoconsent .switches [value="on"]')).to.not.exist;
      expect(subject.query('#autoconsent .switches [value="off"]').textContent.trim()).to.equal('control_center_switch_off');
    });

    it('renders "Turned off for this domain"', function () {
      expect(subject.query('#autoconsent .row-text .description')).to.exist;
      expect(subject.query('#autoconsent .row-text .description').textContent.trim()).to.equal('control_center_autoconsent_inactive');
    });

    it('renders dropdown', function () {
      expect(subject.query('#autoconsent .new-dropdown .dropdown-content-option[value="inactive"]')).to.exist;
      expect(subject.query('#autoconsent .new-dropdown .dropdown-content-option[value="inactive"]').textContent.trim()).to.equal('control_center_this_domain');
      expect(subject.query('#autoconsent .new-dropdown .dropdown-content-option[value="critical"]')).to.exist;
      expect(subject.query('#autoconsent .new-dropdown .dropdown-content-option[value="critical"]').textContent.trim()).to.equal('control_center_all_sites');
    });

    it('shows "This domain" selected', function () {
      expect(subject.query('#autoconsent .new-dropdown .dropdown-btn .dropdown-content-option-text')).to.exist;
      expect(subject.query('#autoconsent .new-dropdown .dropdown-btn .dropdown-content-option-text').textContent.trim()).to.equal('control_center_this_domain');
    });

    it('checkbox is invisible', function () {
      expect(subject.query('#autoconsent #autoconsentDenyCheckbox')).to.not.exist;
    });
  }

  describe('autoconsent onboarding', () => {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: AUTOCONSENT_INITIAL,
      });
      return subject.load();
    });

    it('renders autoconsent box', () => {
      expect(subject.query('#autoconsent')).to.not.be.null;
    });

    testRenderOffAllSites(subject);
  });

  describe('autoconsent enabled', () => {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: AUTOCONSENT_ENABLED,
      });
      return subject.load();
    });

    it('renders autoconsent box', () => {
      expect(subject.query('#autoconsent')).to.not.be.null;
    });

    testRenderOn(true);
  });

  describe('autoconsent enabled', () => {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: AUTOCONSENT_DEFAULT_ALLOW,
      });
      return subject.load();
    });

    it('renders autoconsent box', () => {
      expect(subject.query('#autoconsent')).to.not.be.null;
    });

    testRenderOn(false);
  });

  describe('autoconsent site whitelisted', () => {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: AUTOCONSENT_SITE_WHITELISTED,
      });
      return subject.load();
    });

    it('renders autoconsent box', () => {
      expect(subject.query('#autoconsent')).to.not.be.null;
    });

    testRenderOffForSite();
  });

  describe('autoconsent disabled', () => {
    before(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: AUTOCONSENT_DISABLED,
      });
      return subject.load();
    });

    it('renders autoconsent box', () => {
      expect(subject.query('#autoconsent')).to.not.be.null;
    });

    testRenderOffAllSites();
  });

  describe('interactions', () => {
    describe('onboarding', () => {
      const initialState = AUTOCONSENT_INITIAL;

      describe('click on switch', () => {
        before(async () => {
          subject.messages = [];
          subject.respondsWith({
            module: target,
            action: 'getData',
            response: initialState,
          });
          await subject.load();
          subject.query('#autoconsent .cqz-switch-box').click();
        });

        testRenderOn(true);

        it('activates autoconsent', function () {
          return waitFor(
            () => subject.messages.find(message => message.action === 'autoconsent-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'switch');
              expect(message).to.have.nested.property('args[0].state', 'active');
              expect(message).to.have.nested.property('args[0].deny', true);
              expect(message).to.have.nested.property('args[0].hostname', 'cliqz.com');
            }
          );
        });
      });

      describe('click on "This website"', () => {
        before(async () => {
          subject.messages = [];
          subject.respondsWith({
            module: target,
            action: 'getData',
            response: initialState,
          });
          await subject.load();
          subject.query('#autoconsent .new-dropdown .dropdown-btn').click();
          await waitFor(() => subject.query('#autoconsent .new-dropdown .new-dropdown-content').classList.contains('visible'));
          return subject.query('#autoconsent .new-dropdown .new-dropdown-content .dropdown-content-option[value="inactive"]').click();
        });

        testRenderOffForSite();

        it('activates autoconsent and disables for current site', function () {
          return waitFor(
            () => subject.messages.find(message => message.action === 'autoconsent-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'off_select');
              expect(message).to.have.nested.property('args[0].state', 'inactive');
              expect(message).to.have.nested.property('args[0].deny', true);
              expect(message).to.have.nested.property('args[0].hostname', 'cliqz.com');
            }
          );
        });
      });
    });

    describe('disabled', () => {
      const initialState = AUTOCONSENT_DISABLED;

      describe('click on switch', () => {
        before(async () => {
          subject.messages = [];
          subject.respondsWith({
            module: target,
            action: 'getData',
            response: initialState,
          });
          await subject.load();
          subject.query('#autoconsent .cqz-switch-box').click();
        });

        testRenderOn(true);

        it('activates autoconsent', function () {
          return waitFor(
            () => subject.messages.find(message => message.action === 'autoconsent-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'switch');
              expect(message).to.have.nested.property('args[0].state', 'active');
              expect(message).to.have.nested.property('args[0].deny', true);
              expect(message).to.have.nested.property('args[0].hostname', 'sourceforge.net');
            }
          );
        });
      });

      describe('click on "This website"', () => {
        before(async () => {
          subject.messages = [];
          subject.respondsWith({
            module: target,
            action: 'getData',
            response: initialState,
          });
          await subject.load();
          subject.query('#autoconsent .new-dropdown .dropdown-btn').click();
          await waitFor(() => subject.query('#autoconsent .new-dropdown .new-dropdown-content').classList.contains('visible'));
          return subject.query('#autoconsent .new-dropdown .new-dropdown-content .dropdown-content-option[value="inactive"]').click();
        });

        testRenderOffForSite();

        it('activates autoconsent and disables for current site', function () {
          return waitFor(
            () => subject.messages.find(message => message.action === 'autoconsent-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'off_select');
              expect(message).to.have.nested.property('args[0].state', 'inactive');
              expect(message).to.have.nested.property('args[0].deny', true);
              expect(message).to.have.nested.property('args[0].hostname', 'sourceforge.net');
            }
          );
        });
      });
    });

    describe('enabled', () => {
      const initialState = AUTOCONSENT_ENABLED;

      describe('click on switch', () => {
        before(async () => {
          subject.messages = [];
          subject.respondsWith({
            module: target,
            action: 'getData',
            response: initialState,
          });
          await subject.load();
          subject.query('#autoconsent .cqz-switch-box').click();
        });

        testRenderOffForSite();

        it('activates autoconsent', function () {
          return waitFor(
            () => subject.messages.find(message => message.action === 'autoconsent-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'switch');
              expect(message).to.have.nested.property('args[0].state', 'inactive');
              expect(message).to.have.nested.property('args[0].deny', true);
              expect(message).to.have.nested.property('args[0].hostname', 'sourceforge.net');
            }
          );
        });
      });

      describe('Toggle allow default', () => {
        before(async () => {
          subject.messages = [];
          subject.respondsWith({
            module: target,
            action: 'getData',
            response: initialState,
          });
          await subject.load();
          subject.query('#autoconsentDenyCheckbox').click();
        });

        testRenderOn(false);

        it('Toggles deny setting', function () {
          return waitFor(
            () => subject.messages.find(message => message.action === 'autoconsent-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'deny');
              expect(message).to.have.nested.property('args[0].state', 'active');
              expect(message).to.have.nested.property('args[0].deny', false);
              expect(message).to.have.nested.property('args[0].hostname', 'sourceforge.net');
            }
          );
        });
      });
    });

    describe('enabled (default allow)', () => {
      const initialState = AUTOCONSENT_DEFAULT_ALLOW;

      describe('click on switch', () => {
        before(async () => {
          subject.messages = [];
          subject.respondsWith({
            module: target,
            action: 'getData',
            response: initialState,
          });
          await subject.load();
          subject.query('#autoconsent .cqz-switch-box').click();
        });

        testRenderOffForSite();

        it('activates autoconsent', function () {
          return waitFor(
            () => subject.messages.find(message => message.action === 'autoconsent-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'switch');
              expect(message).to.have.nested.property('args[0].state', 'inactive');
              expect(message).to.have.nested.property('args[0].deny', false);
              expect(message).to.have.nested.property('args[0].hostname', 'sourceforge.net');
            }
          );
        });
      });

      describe('Toggle allow default', () => {
        before(async () => {
          subject.messages = [];
          subject.respondsWith({
            module: target,
            action: 'getData',
            response: initialState,
          });
          await subject.load();
          subject.query('#autoconsentDenyCheckbox').click();
        });

        testRenderOn(true);

        it('Toggles deny setting', function () {
          return waitFor(
            () => subject.messages.find(message => message.action === 'autoconsent-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'deny');
              expect(message).to.have.nested.property('args[0].state', 'active');
              expect(message).to.have.nested.property('args[0].deny', true);
              expect(message).to.have.nested.property('args[0].hostname', 'sourceforge.net');
            }
          );
        });
      });
    });

    describe('disabled for website', () => {
      const initialState = AUTOCONSENT_SITE_WHITELISTED;

      describe('click on switch', () => {
        before(async () => {
          subject.messages = [];
          subject.respondsWith({
            module: target,
            action: 'getData',
            response: initialState,
          });
          await subject.load();
          subject.query('#autoconsent .cqz-switch-box').click();
        });

        testRenderOn(true);

        it('activates autoconsent', function () {
          return waitFor(
            () => subject.messages.find(message => message.action === 'autoconsent-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'switch');
              expect(message).to.have.nested.property('args[0].state', 'active');
              expect(message).to.have.nested.property('args[0].deny', true);
              expect(message).to.have.nested.property('args[0].hostname', 'sourceforge.net');
            }
          );
        });
      });

      describe('click on "All websites"', () => {
        before(async () => {
          subject.messages = [];
          subject.respondsWith({
            module: target,
            action: 'getData',
            response: initialState,
          });
          await subject.load();
          subject.query('#autoconsent .new-dropdown .dropdown-btn').click();
          await waitFor(() => subject.query('#autoconsent .new-dropdown .new-dropdown-content').classList.contains('visible'));
          return subject.query('#autoconsent .new-dropdown .new-dropdown-content .dropdown-content-option[value="critical"]').click();
        });

        testRenderOffAllSites();

        it('disables autoconsent for all sites', function () {
          return waitFor(
            () => subject.messages.find(message => message.action === 'autoconsent-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'off_select');
              expect(message).to.have.nested.property('args[0].state', 'critical');
              expect(message).to.have.nested.property('args[0].deny', true);
              expect(message).to.have.nested.property('args[0].hostname', 'sourceforge.net');
            }
          );
        });
      });
    });
  });
});
