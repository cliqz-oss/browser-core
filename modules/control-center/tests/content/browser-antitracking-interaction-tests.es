import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { generateDataOn, generateDataOffSite, generateDataOffAll } from './fixtures/antitracking';

function antitrackingInteractionTests(amo) {
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
  });

  function updateGeneralStateTest(selector, state) {
    it('sends message to update general state', function () {
      subject.query(selector).click();

      return waitFor(
        () => subject.messages.find(message => message.message.action === 'updateState')
      ).then(
        message => expect(message).to.have.nested.property('message.data', state)
      );
    });
  }

  function antitrackingDropdown() {
    it('renders "This domain"', function () {
      expect(subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]')).to.exist;
      expect(subject.getComputedStyle('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').display).to.not.equal('none');
    });

    it('renders "All websites"', function () {
      expect(subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]')).to.exist;
      expect(subject.getComputedStyle('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').display).to.not.equal('none');
    });
  }

  describe('with anti-tracking on', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOn);
    });

    it('renders anti-tracking box', function () {
      expect(subject.query('#anti-tracking')).to.exist;
    });

    describe('click on antitracking switch', function () {
      updateGeneralStateTest('#anti-tracking .antitracking .cqz-switch-box', 'inactive');

      it('sends message to deactivate antitracking', function () {
        subject.query('#anti-tracking .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'antitracking-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.type', 'switch');
            expect(message).to.have.nested.property('message.data.state', 'inactive');
            expect(message).to.have.nested.property('message.data.status', 'inactive');
            expect(message).to.have.nested.property('message.data.hostname', dataOn.hostname);
          }
        );
      });
    });
  });

  describe('with anti-tracking off for this domain', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOffSite);
    });

    it('renders anti-tracking box', function () {
      expect(subject.query('#anti-tracking')).to.exist;
    });

    describe('click on antitracking switch', function () {
      updateGeneralStateTest('#anti-tracking .antitracking .cqz-switch-box', 'active');

      it('sends message to activate antitracking', function () {
        subject.query('#anti-tracking .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'antitracking-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.type', 'switch');
            expect(message).to.have.nested.property('message.data.state', 'active');
            expect(message).to.have.nested.property('message.data.status', 'active');
            expect(message).to.have.nested.property('message.data.hostname', dataOffSite.hostname);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach(function () {
        subject.query('#anti-tracking .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#anti-tracking .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      antitrackingDropdown();

      context('click on "All websites"', function () {
        updateGeneralStateTest('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]', 'critical');

        it('sends message to deactivate antitracking for all websites', function () {
          subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'antitracking-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('message.data.type', 'off_select');
              expect(message).to.have.nested.property('message.data.state', 'off_all');
              expect(message).to.have.nested.property('message.data.status', 'critical');
              expect(message).to.have.nested.property('message.data.hostname', dataOffSite.hostname);
            }
          );
        });
      });
    });
  });

  describe('with anti-tracking off for all websites', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOffAll);
    });

    it('renders anti-tracking box', function () {
      expect(subject.query('#anti-tracking')).to.exist;
    });

    describe('click on antitracking switch', function () {
      updateGeneralStateTest('#anti-tracking .antitracking .cqz-switch-box', 'active');

      it('sends message to activate antitracking', function () {
        subject.query('#anti-tracking .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'antitracking-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.type', 'switch');
            expect(message).to.have.nested.property('message.data.state', 'active');
            expect(message).to.have.nested.property('message.data.status', 'active');
            expect(message).to.have.nested.property('message.data.hostname', dataOffAll.hostname);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach(function () {
        subject.query('#anti-tracking .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#anti-tracking .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      antitrackingDropdown();

      context('click on "This domain"', function () {
        updateGeneralStateTest('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]', 'inactive');

        it('sends message to deactivate antitracking for this domain', function () {
          subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'antitracking-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('message.data.type', 'off_select');
              expect(message).to.have.nested.property('message.data.state', 'off_website');
              expect(message).to.have.nested.property('message.data.status', 'inactive');
              expect(message).to.have.nested.property('message.data.hostname', dataOffAll.hostname);
            }
          );
        });
      });
    });
  });
}

describe('Control Center: Anti-Tracking interaction browser', function () {
  antitrackingInteractionTests(false);
});

describe('Control Center: AMO, Anti-Tracking Interaction tests', function () {
  antitrackingInteractionTests(true);
});
