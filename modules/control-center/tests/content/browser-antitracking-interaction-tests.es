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
  const target = 'control-center';
  let subject;

  beforeEach(function () {
    subject = new Subject();
  });

  afterEach(function () {
    subject.unload();
  });

  function updateGeneralStateTest(selector, state) {
    it('sends message to update general state', function () {
      subject.query(selector).click();

      return waitFor(
        () => subject.messages.find(message => message.action === 'updateState')
      ).then(
        message => expect(message).to.have.property('args').that.deep.equals([state])
      );
    });
  }

  function antitrackingDropdown() {
    it('renders "This domain"', function () {
      expect(subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]')).display).to.not.equal('none');
    });

    it('renders "All websites"', function () {
      expect(subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]')).to.exist;
      expect(subject.getComputedStyle(subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]')).display).to.not.equal('none');
    });
  }

  describe('with anti-tracking on', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOn
      });
      return subject.load();
    });

    it('renders anti-tracking box', function () {
      expect(subject.query('#anti-tracking')).to.exist;
    });

    describe('click on antitracking switch', function () {
      updateGeneralStateTest('#anti-tracking .antitracking .cqz-switch-box', 'inactive');

      it('sends message to deactivate antitracking', function () {
        subject.query('#anti-tracking .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'antitracking-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('args[0].state', 'inactive');
            expect(message).to.have.nested.property('args[0].type', 'switch');
            expect(message).to.have.nested.property('args[0].status', 'inactive');
            expect(message).to.have.nested.property('args[0].hostname', dataOn.hostname);
          }
        );
      });
    });
  });

  describe('with anti-tracking off for this domain', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffSite
      });
      return subject.load();
    });

    it('renders anti-tracking box', function () {
      expect(subject.query('#anti-tracking')).to.exist;
    });

    describe('click on antitracking switch', function () {
      updateGeneralStateTest('#anti-tracking .antitracking .cqz-switch-box', 'active');

      it('sends message to activate antitracking', function () {
        subject.query('#anti-tracking .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'antitracking-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('args[0].type', 'switch');
            expect(message).to.have.nested.property('args[0].state', 'active');
            expect(message).to.have.nested.property('args[0].status', 'active');
            expect(message).to.have.nested.property('args[0].hostname', dataOffSite.hostname);
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
            () => subject.messages.find(message => message.action === 'antitracking-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'off_select');
              expect(message).to.have.nested.property('args[0].state', 'off_all');
              expect(message).to.have.nested.property('args[0].status', 'critical');
              expect(message).to.have.nested.property('args[0].hostname', dataOffSite.hostname);
            }
          );
        });
      });
    });
  });

  describe('with anti-tracking off for all websites', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOffAll
      });
      return subject.load();
    });

    it('renders anti-tracking box', function () {
      expect(subject.query('#anti-tracking')).to.exist;
    });

    describe('click on antitracking switch', function () {
      updateGeneralStateTest('#anti-tracking .antitracking .cqz-switch-box', 'active');

      it('sends message to activate antitracking', function () {
        subject.query('#anti-tracking .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'antitracking-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('args[0].type', 'switch');
            expect(message).to.have.nested.property('args[0].state', 'active');
            expect(message).to.have.nested.property('args[0].status', 'active');
            expect(message).to.have.nested.property('args[0].hostname', dataOffAll.hostname);
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
            () => subject.messages.find(message => message.action === 'antitracking-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('args[0].type', 'off_select');
              expect(message).to.have.nested.property('args[0].state', 'off_website');
              expect(message).to.have.nested.property('args[0].status', 'inactive');
              expect(message).to.have.nested.property('args[0].hostname', dataOffAll.hostname);
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
