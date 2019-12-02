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
import { generateDataOn, generateDataOffSite, generateDataOffAll } from './fixtures/antiphishing';

function antiphishingInteractionTests(amo) {
  const dataOn = generateDataOn(amo);
  const dataOffSite = generateDataOffSite(amo);
  const dataOffAll = generateDataOffAll(amo);
  const target = 'control-center';
  let subject;

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

  describe('with antiphishing on', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOn
      });
      return subject.load();
    });

    it('renders antiphishing box', function () {
      expect(subject.query('#anti-phishing')).to.exist;
    });

    describe('click on antiphishing switch', function () {
      updateGeneralStateTest('#anti-phishing .cqz-switch-box');

      it('sends message to deactivate antiphishing', function () {
        subject.query('#anti-phishing .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'anti-phishing-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('args[0].type', 'switch');
            expect(message).to.have.nested.property('args[0].state', 'inactive');
            expect(message).to.have.nested.property('args[0].url', dataOn.activeURL);
          }
        );
      });
    });
  });

  describe('with antiphishing off for this domain', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffSite
      });
      return subject.load();
    });

    it('renders antiphishing box', function () {
      expect(subject.query('#anti-phishing')).to.exist;
    });

    describe('click on antiphishing switch', function () {
      updateGeneralStateTest('#anti-phishing .cqz-switch-box');

      it('sends message to activate antiphishing', function () {
        subject.query('#anti-phishing .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'anti-phishing-activator')
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
        subject.query('#anti-phishing .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#anti-phishing .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      it('renders "This domain"', function () {
        expect(subject.query('#anti-phishing .new-dropdown .new-dropdown-content .dropdown-content-option[value="inactive"]')).to.exist;
      });

      it('renders "All websites"', function () {
        expect(subject.query('#anti-phishing .new-dropdown .new-dropdown-content .dropdown-content-option[value="critical"]')).to.exist;
      });

      context('click on "All websites"', function () {
        updateGeneralStateTest('#anti-phishing .new-dropdown .new-dropdown-content .dropdown-content-option[value="critical"]');

        it('sends message to deactivate antiphishing', function () {
          subject.query('#anti-phishing .new-dropdown .new-dropdown-content .dropdown-content-option[value="critical"]').click();

          return waitFor(
            () => subject.messages.find(message => message.action === 'anti-phishing-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'off_select');
              expect(message).to.have.nested.property('args[0].state', 'critical');
              expect(message).to.have.nested.property('args[0].url', dataOffSite.activeURL);
            }
          );
        });
      });
    });
  });

  describe('with antiphishing off for all websites', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffAll
      });
      return subject.load();
    });

    it('renders antiphishing box', function () {
      expect(subject.query('#anti-phishing')).to.exist;
    });

    describe('click on antiphishing switch', function () {
      updateGeneralStateTest('#anti-phishing .cqz-switch-box');

      it('sends message to activate antiphishing', function () {
        subject.query('#anti-phishing .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'anti-phishing-activator')
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
        subject.query('#anti-phishing .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#anti-phishing .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      it('renders "This domain"', function () {
        expect(subject.query('#anti-phishing .new-dropdown .new-dropdown-content .dropdown-content-option[value="inactive"]')).to.exist;
      });

      it('renders "All websites"', function () {
        expect(subject.query('#anti-phishing .new-dropdown .new-dropdown-content .dropdown-content-option[value="critical"]')).to.exist;
      });

      context('click on "This domain"', function () {
        updateGeneralStateTest('#anti-phishing .new-dropdown .new-dropdown-content .dropdown-content-option[value="inactive"]');

        it('sends message to deactivate antiphishing', function () {
          subject.query('#anti-phishing .new-dropdown .new-dropdown-content .dropdown-content-option[value="inactive"]').click();

          return waitFor(
            () => subject.messages.find(message => message.action === 'anti-phishing-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'off_select');
              expect(message).to.have.nested.property('args[0].state', 'inactive');
              expect(message).to.have.nested.property('args[0].url', dataOffAll.activeURL);
            }
          );
        });
      });
    });
  });
}

describe('Control center: Anti-Phishing interaction browser', function () {
  antiphishingInteractionTests(false);
});


describe('Control Center: AMO Anti-Phishing Interaction tests', function () {
  antiphishingInteractionTests(true);
});
