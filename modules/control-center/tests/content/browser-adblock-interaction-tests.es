import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import {dataOn, dataOffPage, dataOffSite, dataOffAll} from './fixtures/adblocker';

describe("Control Center: Ad-Block interaction browser", function () {
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  })

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
        message => chai.expect(message).to.have.nested.property('message.data', 'active')
      );
    });
  };

  function adblockerDropdown() {
    it('renders "This page"', function () {
      chai.expect(subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]')).to.exist;
      chai.expect(subject.getComputedStyle('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="page"]').display).to.not.equal('none');
    });

    it('renders "This domain"', function () {
      chai.expect(subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]')).to.exist;
      chai.expect(subject.getComputedStyle('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="domain"]').display).to.not.equal('none');
    });

    it('renders "All websites"', function () {
      chai.expect(subject.query('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]')).to.exist;
      chai.expect(subject.getComputedStyle('#ad-blocking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all-sites"]').display).to.not.equal('none');
    });
  }

  it('loads', function () {
    chai.expect(true).to.eql(true);
  });

  describe('with ad-blocker on', function () {
    beforeEach(() => {
      return subject.pushData(dataOn);
    });

    it('renders ad-blocker box', function () {
      chai.expect(subject.query('#ad-blocking')).to.exist;
    });

    describe("click on ad-blocker switch", function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to deactivate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'adb-activator')
        ).then(
          message => {
            chai.expect(message).to.have.nested.property('message.data.type', 'switch');
            chai.expect(message).to.have.nested.property('message.data.state', 'off');
            chai.expect(message).to.have.nested.property('message.data.status', 'off');
            chai.expect(message).to.have.nested.property('message.data.url', dataOn.activeURL);
          }
        );
      });
    });
  });

  describe('with ad-blocker off for this page', function () {
    beforeEach(() => {
      return subject.pushData(dataOffPage);
    });

    it('renders ad-blocker box', function () {
      chai.expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to activate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "adb-activator")
        ).then(
          message => {
            chai.expect(message).to.have.nested.property("message.data.type", "switch");
            chai.expect(message).to.have.nested.property("message.data.state", "active");
            chai.expect(message).to.have.nested.property("message.data.status", "active");
            chai.expect(message).to.have.nested.property("message.data.url", dataOffPage.activeURL);
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
            message => {
             chai.expect(message).to.have.nested.property('message.data.type', 'off_select');
             chai.expect(message).to.have.nested.property('message.data.state', 'off_domain');
             chai.expect(message).to.have.nested.property('message.data.status', 'off');
             chai.expect(message).to.have.nested.property('message.data.url', dataOffPage.activeURL);
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
            message => {
             chai.expect(message).to.have.nested.property('message.data.type', 'off_select');
             chai.expect(message).to.have.nested.property('message.data.state', 'off_all');
             chai.expect(message).to.have.nested.property('message.data.status', 'off');
             chai.expect(message).to.have.nested.property('message.data.url', dataOffPage.activeURL);
            }
          );
        });
      });
    });
  });

  describe('with ad-blocker off for this domain', function () {
    beforeEach(() => {
      return subject.pushData(dataOffSite);
    });

    it('renders ad-blocker box', function () {
      chai.expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to activate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "adb-activator")
        ).then(
          message => {
            chai.expect(message).to.have.nested.property("message.data.type", "switch");
            chai.expect(message).to.have.nested.property("message.data.state", "active");
            chai.expect(message).to.have.nested.property("message.data.status", "active");
            chai.expect(message).to.have.nested.property("message.data.url", dataOffSite.activeURL);
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
            message => {
             chai.expect(message).to.have.nested.property('message.data.type', 'off_select');
             chai.expect(message).to.have.nested.property('message.data.state', 'off_website');
             chai.expect(message).to.have.nested.property('message.data.status', 'off');
             chai.expect(message).to.have.nested.property('message.data.url', dataOffSite.activeURL);
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
            message => {
             chai.expect(message).to.have.nested.property('message.data.type', 'off_select');
             chai.expect(message).to.have.nested.property('message.data.state', 'off_all');
             chai.expect(message).to.have.nested.property('message.data.status', 'off');
             chai.expect(message).to.have.nested.property('message.data.url', dataOffSite.activeURL);
            }
          );
        });
      });
    });
  });

  describe('with ad-blocker off for all websites', function () {
    beforeEach(() => {
      return subject.pushData(dataOffAll);
    });

    it('renders ad-blocker box', function () {
      chai.expect(subject.query('#ad-blocking')).to.exist;
    });

    describe('click on ad-blocker switch', function () {
      updateGeneralStateTest('#ad-blocking .adblocker .cqz-switch-box');

      it('sends message to activate ad-blocker', function () {
        subject.query('#ad-blocking .adblocker .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "adb-activator")
        ).then(
          message => {
            chai.expect(message).to.have.nested.property("message.data.type", "switch");
            chai.expect(message).to.have.nested.property("message.data.state", "active");
            chai.expect(message).to.have.nested.property("message.data.status", "active");
            chai.expect(message).to.have.nested.property("message.data.url", dataOffAll.activeURL);
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
            message => {
             chai.expect(message).to.have.nested.property('message.data.type', 'off_select');
             chai.expect(message).to.have.nested.property('message.data.state', 'off_website');
             chai.expect(message).to.have.nested.property('message.data.status', 'off');
             chai.expect(message).to.have.nested.property('message.data.url', dataOffAll.activeURL);
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
            message => {
             chai.expect(message).to.have.nested.property('message.data.type', 'off_select');
             chai.expect(message).to.have.nested.property('message.data.state', 'off_domain');
             chai.expect(message).to.have.nested.property('message.data.status', 'off');
             chai.expect(message).to.have.nested.property('message.data.url', dataOffAll.activeURL);
            }
          );
        });
      });
    });
  });
})
