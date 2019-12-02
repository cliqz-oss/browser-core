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
import { dataOn, dataOffSite, dataOffAll } from './fixtures/adblocker';

describe('Control Center: Ad-Block interaction browser', function () {
  let subject;
  const target = 'control-center';

  beforeEach(function () {
    subject = new Subject();
  });

  afterEach(function () {
    subject.unload();
  });

  function updateGeneralStateTest(selector) {
    it('sends message to update general state', function () {
      subject.query(selector).click();

      return waitFor(
        () => subject.messages.find(message => message.action === 'updateState')
      ).then(
        message => expect(message).to.have.property('args').that.deep.equals(['active'])
      );
    });
  }

  function adblockerDropdown() {
    it('renders "This domain"', function () {
      expect(subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="off_domain"]')).to.exist;
    });

    it('renders "All websites"', function () {
      expect(subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="off_all"]')).to.exist;
    });
  }

  describe('with ad-blocker on', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: JSON.parse(JSON.stringify(dataOn)),
      });
      return subject.load();
    });

    it('renders ad-blocker box', function () {
      expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to deactivate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'adb-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('args[0].type', 'switch');
            expect(message).to.have.nested.property('args[0].state', 'off_domain');
            expect(message).to.have.nested.property('args[0].url', dataOn.activeURL);
          }
        );
      });
    });
  });

  describe('with ad-blocker off for this domain', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: JSON.parse(JSON.stringify(dataOffSite))
      });
      return subject.load();
    });

    it('renders ad-blocker box', function () {
      expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to activate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'adb-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('args[0].type', 'switch');
            expect(message).to.have.nested.property('args[0].state', 'active');
            expect(message).to.have.nested.property('args[0].url', dataOffSite.activeURL);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach(function () {
        subject.query('#ad-blocking .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#ad-blocking .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      adblockerDropdown();

      context('click on "All websites"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="off_all"]');

        it('sends message to deactivate adblocker for all websites', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="off_all"]').click();

          return waitFor(
            () => subject.messages.find(message => message.action === 'adb-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'off_select');
              expect(message).to.have.nested.property('args[0].state', 'off_all');
              expect(message).to.have.nested.property('args[0].url', dataOffSite.activeURL);
            }
          );
        });
      });
    });
  });

  describe('with ad-blocker off for all websites', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: JSON.parse(JSON.stringify(dataOffAll))
      });
      return subject.load();
    });

    it('renders ad-blocker box', function () {
      expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to activate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'adb-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('args[0].type', 'switch');
            expect(message).to.have.nested.property('args[0].state', 'active');
            expect(message).to.have.nested.property('args[0].url', dataOffAll.activeURL);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach(function () {
        subject.query('#ad-blocking .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#ad-blocking .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      adblockerDropdown();

      context('click on "This domain"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="off_domain"]');

        it('sends message to deactivate adblocker for this domain', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="off_domain"]').click();

          return waitFor(
            () => subject.messages.find(message => message.action === 'adb-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'off_select');
              expect(message).to.have.nested.property('args[0].state', 'off_domain');
              expect(message).to.have.nested.property('args[0].url', dataOffAll.activeURL);
            }
          );
        });
      });
    });
  });
});
