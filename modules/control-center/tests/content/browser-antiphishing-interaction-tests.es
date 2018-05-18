import {
  clearIntervals,
  expect,
  waitFor
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { generateDataOn, generateDataOffSite, generateDataOffAll } from './fixtures/antiphishing';

function antiphishingInteractionTests(amo) {
  const dataOn = generateDataOn(amo);
  const dataOffSite = generateDataOffSite(amo);
  const dataOffAll = generateDataOffAll(amo);
  const target = 'cliqz-control-center';
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  });

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  function updateGeneralStateTest(selector) {
    it('sends message to update general state', function () {
      subject.query(selector).click();

      return waitFor(
        () => subject.messages.find(message => message.message.action === 'updateState')
      ).then(
        message => expect(message).to.have.nested.property('message.data', 'active')
      );
    });
  }

  describe('with antiphishing on', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOn);
    });

    it('renders antiphishing box', function () {
      expect(subject.query('#anti-phising')).to.exist;
    });

    describe('click on antiphishing switch', function () {
      updateGeneralStateTest('#anti-phising .cqz-switch-box');

      it('sends message to deactivate antiphishing', function () {
        subject.query('#anti-phising .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.type', 'switch');
            expect(message).to.have.nested.property('message.data.state', 'inactive');
            expect(message).to.have.nested.property('message.data.status', 'inactive');
            expect(message).to.have.nested.property('message.data.url', dataOn.activeURL);
          }
        );
      });
    });
  });

  describe('with antiphishing off for this domain', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOffSite);
    });

    it('renders antiphishing box', function () {
      expect(subject.query('#anti-phising')).to.exist;
    });

    describe('click on antiphishing switch', function () {
      updateGeneralStateTest('#anti-phising .cqz-switch-box');

      it('sends message to activate antiphishing', function () {
        subject.query('#anti-phising .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.type', 'switch');
            expect(message).to.have.nested.property('message.data.state', 'active');
            expect(message).to.have.nested.property('message.data.status', 'active');
            expect(message).to.have.nested.property('message.data.url', dataOffSite.activeURL);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach(function () {
        subject.query('#anti-phising .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#anti-phising .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      it('renders "This domain"', function () {
        expect(subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]')).to.exist;
        expect(subject.getComputedStyle('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').display).to.not.equal('none');
      });

      it('renders "All websites"', function () {
        expect(subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]')).to.exist;
        expect(subject.getComputedStyle('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').display).to.not.equal('none');
      });

      context('click on "All websites"', function () {
        updateGeneralStateTest('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]');

        it('sends message to deactivate antiphishing', function () {
          subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('message.data.type', 'off_select');
              expect(message).to.have.nested.property('message.data.state', 'off_all');
              expect(message).to.have.nested.property('message.data.status', 'critical');
              expect(message).to.have.nested.property('message.data.url', dataOffSite.activeURL);
            }
          );
        });
      });
    });
  });

  describe('with antiphishing off for all websites', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOffAll);
    });

    it('renders antiphishing box', function () {
      expect(subject.query('#anti-phising')).to.exist;
    });

    describe('click on antiphishing switch', function () {
      updateGeneralStateTest('#anti-phising .cqz-switch-box');

      it('sends message to activate antiphishing', function () {
        subject.query('#anti-phising .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.type', 'switch');
            expect(message).to.have.nested.property('message.data.state', 'active');
            expect(message).to.have.nested.property('message.data.status', 'active');
            expect(message).to.have.nested.property('message.data.url', dataOffAll.activeURL);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach(function () {
        subject.query('#anti-phising .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#anti-phising .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      it('renders "This domain"', function () {
        expect(subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]')).to.exist;
        expect(subject.getComputedStyle('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').display).to.not.equal('none');
      });

      it('renders "All websites"', function () {
        expect(subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]')).to.exist;
        expect(subject.getComputedStyle('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').display).to.not.equal('none');
      });

      context('click on "This domain"', function () {
        updateGeneralStateTest('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]');

        it('sends message to deactivate antiphishing', function () {
          subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('message.data.type', 'off_select');
              expect(message).to.have.nested.property('message.data.state', 'off_website');
              expect(message).to.have.nested.property('message.data.status', 'inactive');
              expect(message).to.have.nested.property('message.data.url', dataOffAll.activeURL);
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
