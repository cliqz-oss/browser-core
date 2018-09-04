import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataOn, dataOffPage, dataOffSite, dataOffAll } from './fixtures/adblocker';

describe('Control Center: Ad-Block interaction browser', function () {
  let subject;
  const target = 'cliqz-control-center';

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  });

  afterEach(function () {
    subject.unload();
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

  function adblockerDropdown() {
    it('renders "This page"', function () {
      expect(subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]')).to.exist;
      expect(subject.getComputedStyle('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]').display).to.not.equal('none');
    });

    it('renders "This domain"', function () {
      expect(subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]')).to.exist;
      expect(subject.getComputedStyle('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]').display).to.not.equal('none');
    });

    it('renders "All websites"', function () {
      expect(subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]')).to.exist;
      expect(subject.getComputedStyle('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]').display).to.not.equal('none');
    });
  }

  describe('with ad-blocker on', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOn);
    });

    it('renders ad-blocker box', function () {
      expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to deactivate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'adb-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.type', 'switch');
            expect(message).to.have.nested.property('message.data.state', 'off');
            expect(message).to.have.nested.property('message.data.status', 'off');
            expect(message).to.have.nested.property('message.data.url', dataOn.activeURL);
          }
        );
      });
    });
  });

  describe('with ad-blocker off for this page', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOffPage);
    });

    it('renders ad-blocker box', function () {
      expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to activate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'adb-activator')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.type', 'switch');
            expect(message).to.have.nested.property('message.data.state', 'active');
            expect(message).to.have.nested.property('message.data.status', 'active');
            expect(message).to.have.nested.property('message.data.url', dataOffPage.activeURL);
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
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]');

        it('sends message to deactivate adblocker for this domain', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'adb-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('message.data.type', 'off_select');
              expect(message).to.have.nested.property('message.data.state', 'off_domain');
              expect(message).to.have.nested.property('message.data.status', 'off');
              expect(message).to.have.nested.property('message.data.url', dataOffPage.activeURL);
            }
          );
        });
      });

      context('click on "All websites"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]');

        it('sends message to deactivate adblocker for all websites', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'adb-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('message.data.type', 'off_select');
              expect(message).to.have.nested.property('message.data.state', 'off_all');
              expect(message).to.have.nested.property('message.data.status', 'off');
              expect(message).to.have.nested.property('message.data.url', dataOffPage.activeURL);
            }
          );
        });
      });
    });
  });

  describe('with ad-blocker off for this domain', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOffSite);
    });

    it('renders ad-blocker box', function () {
      expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to activate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'adb-activator')
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
        subject.query('#ad-blocking .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#ad-blocking .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      adblockerDropdown();

      context('click on "This page"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]');

        it('sends message to deactivate adblocker for this page', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'adb-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('message.data.type', 'off_select');
              expect(message).to.have.nested.property('message.data.state', 'off_website');
              expect(message).to.have.nested.property('message.data.status', 'off');
              expect(message).to.have.nested.property('message.data.url', dataOffSite.activeURL);
            }
          );
        });
      });

      context('click on "All websites"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]');

        it('sends message to deactivate adblocker for all websites', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'adb-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('message.data.type', 'off_select');
              expect(message).to.have.nested.property('message.data.state', 'off_all');
              expect(message).to.have.nested.property('message.data.status', 'off');
              expect(message).to.have.nested.property('message.data.url', dataOffSite.activeURL);
            }
          );
        });
      });
    });
  });

  describe('with ad-blocker off for all websites', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOffAll);
    });

    it('renders ad-blocker box', function () {
      expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to activate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'adb-activator')
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
        subject.query('#ad-blocking .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#ad-blocking .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      adblockerDropdown();

      context('click on "This page"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]');

        it('sends message to deactivate adblocker for this page', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'adb-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('message.data.type', 'off_select');
              expect(message).to.have.nested.property('message.data.state', 'off_website');
              expect(message).to.have.nested.property('message.data.status', 'off');
              expect(message).to.have.nested.property('message.data.url', dataOffAll.activeURL);
            }
          );
        });
      });

      context('click on "This domain"', function () {
        updateGeneralStateTest('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]');

        it('sends message to deactivate adblocker for this domain', function () {
          subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'adb-activator')
          ).then(
            (message) => {
              expect(message).to.have.nested.property('message.data.type', 'off_select');
              expect(message).to.have.nested.property('message.data.state', 'off_domain');
              expect(message).to.have.nested.property('message.data.status', 'off');
              expect(message).to.have.nested.property('message.data.url', dataOffAll.activeURL);
            }
          );
        });
      });
    });
  });
});
