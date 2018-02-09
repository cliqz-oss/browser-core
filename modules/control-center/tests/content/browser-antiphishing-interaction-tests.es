import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import {generateDataOn, generateDataOffSite, generateDataOffAll} from './fixtures/antiphishing';

function antiphishingInteractionTests(amo) {
  const dataOn = generateDataOn(amo);
  const dataOffSite = generateDataOffSite(amo);
  const dataOffAll = generateDataOffAll(amo);
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

  it("loads", function () {
    chai.expect(true).to.eql(true);
  })

  describe("with antiphishing on", function() {
    beforeEach(() => {
      return subject.pushData(dataOn);
    })

    it("renders antiphishing box", function () {
      chai.expect(subject.query('#anti-phising')).to.exist;
    });

    describe("click on antiphishing switch", function () {
      updateGeneralStateTest('#anti-phising .cqz-switch-box');

      it('sends message to deactivate antiphishing', function () {
        subject.query('#anti-phising .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "anti-phishing-activator")
        ).then(
          message => {
            chai.expect(message).to.have.nested.property("message.data.type", "switch");
            chai.expect(message).to.have.nested.property("message.data.state", "inactive");
            chai.expect(message).to.have.nested.property("message.data.status", "inactive");
            chai.expect(message).to.have.nested.property("message.data.url", dataOn.activeURL);
          }
        );
      });
    });
  });

  describe("with antiphishing off for this domain", function() {
    beforeEach(() => {
      return subject.pushData(dataOffSite);
    })

    it('renders antiphishing box', function () {
      chai.expect(subject.query('#anti-phising')).to.exist;
    });

    describe('click on antiphishing switch', function () {
      updateGeneralStateTest('#anti-phising .cqz-switch-box');

      it('sends message to activate antiphishing', function () {
        subject.query('#anti-phising .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
        ).then(
          message => {
            chai.expect(message).to.have.nested.property('message.data.type', 'switch');
            chai.expect(message).to.have.nested.property('message.data.state', 'active');
            chai.expect(message).to.have.nested.property('message.data.status', 'active');
            chai.expect(message).to.have.nested.property('message.data.url', dataOffSite.activeURL);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach( function () {
        subject.query('#anti-phising .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#anti-phising .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      it('renders "This domain"', function () {
        chai.expect(subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]')).to.exist;
        chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').display).to.not.equal('none');
      });

      it('renders "All websites"', function () {
        chai.expect(subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]')).to.exist;
        chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').display).to.not.equal('none');
      });

      context('click on "All websites"', function () {
        updateGeneralStateTest('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]');

        it('sends message to deactivate antiphishing', function () {
          subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
          ).then(
            message => {
              chai.expect(message).to.have.nested.property('message.data.type', 'off_select');
              chai.expect(message).to.have.nested.property('message.data.state', 'off_all');
              chai.expect(message).to.have.nested.property('message.data.status', 'critical');
              chai.expect(message).to.have.nested.property('message.data.url', dataOffSite.activeURL);
            }
          );
        });
      });
    });
  });

  describe('with antiphishing off for all websites', function() {
    beforeEach(() => {
      return subject.pushData(dataOffAll);
    })

    it('renders antiphishing box', function () {
      chai.expect(subject.query('#anti-phising')).to.exist;
    });

    describe('click on antiphishing switch', function () {
      updateGeneralStateTest('#anti-phising .cqz-switch-box');

      it('sends message to activate antiphishing', function () {
        subject.query('#anti-phising .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
        ).then(
          message => {
            chai.expect(message).to.have.nested.property('message.data.type', 'switch');
            chai.expect(message).to.have.nested.property('message.data.state', 'active');
            chai.expect(message).to.have.nested.property('message.data.status', 'active');
            chai.expect(message).to.have.nested.property('message.data.url', dataOffAll.activeURL);
          }
        );
      });
    });

    describe('click on dropdown', function () {
      beforeEach( function () {
        subject.query('#anti-phising .new-dropdown .dropdown-btn').click();
        return waitFor(() => subject.query('#anti-phising .new-dropdown .new-dropdown-content').classList.contains('visible'));
      });

      it('renders "This domain"', function () {
        chai.expect(subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]')).to.exist;
        chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').display).to.not.equal('none');
      });

      it('renders "All websites"', function () {
        chai.expect(subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]')).to.exist;
        chai.expect(subject.getComputedStyle('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').display).to.not.equal('none');
      });

      context('click on "This domain"', function () {
        updateGeneralStateTest('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]');

        it('sends message to deactivate antiphishing', function () {
          subject.query('#anti-phising .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').click();

          return waitFor(
            () => subject.messages.find(message => message.message.action === 'anti-phishing-activator')
          ).then(
            message => {
              chai.expect(message).to.have.nested.property('message.data.type', 'off_select');
              chai.expect(message).to.have.nested.property('message.data.state', 'off_website');
              chai.expect(message).to.have.nested.property('message.data.status', 'inactive');
              chai.expect(message).to.have.nested.property('message.data.url', dataOffAll.activeURL);
            }
          );
        });
      });
    });
  });
};

describe("Control center: Anti-Phishing interaction browser", function () {
  antiphishingInteractionTests(false);
});


describe('Control Center: AMO Anti-Phishing Interaction tests', function () {
  antiphishingInteractionTests(true);
})
