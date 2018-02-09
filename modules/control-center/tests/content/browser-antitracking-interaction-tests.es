import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import {generateDataOn, generateDataOffSite, generateDataOffAll} from './fixtures/antitracking';

function antitrackingInteractionTests(amo) {
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

  function updateGeneralStateTest(selector, state) {
    it('sends message to update general state', function () {
      subject.query(selector).click();

      return waitFor(
        () => subject.messages.find(message => message.message.action === 'updateState')
      ).then(
        message => chai.expect(message).to.have.deep.property('message.data', state)
      );
    });
  };

  function antitrackingDropdown() {
    it('renders "This domain"', function () {
      chai.expect(subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="this"]').display).to.not.equal('none');
    });

    it('renders "All websites"', function () {
      chai.expect(subject.query('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]')).to.exist;
      chai.expect(subject.getComputedStyle('#anti-tracking .new-dropdown .new-dropdown-content .dropdown-content-option[value="all"]').display).to.not.equal('none');
    });
  };

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('with anti-tracking on', function () {
    beforeEach(() => {
      return subject.pushData(dataOn);
    });

    it('renders anti-tracking box', function () {
      chai.expect(subject.query('#anti-tracking')).to.exist;
    });

    describe("click on antitracking switch", function () {
      updateGeneralStateTest('#anti-tracking .antitracking .cqz-switch-box', 'inactive');

      it('sends message to deactivate antitracking', function () {
        subject.query('#anti-tracking .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "antitracking-activator")
        ).then(
          message => {
            chai.expect(message).to.have.deep.property("message.data.type", "switch");
            chai.expect(message).to.have.deep.property("message.data.state", "inactive");
            chai.expect(message).to.have.deep.property("message.data.status", "inactive");
            chai.expect(message).to.have.deep.property("message.data.hostname", dataOn.hostname);
          }
        );
      });
    });
  });

  describe('with anti-tracking off for this domain', function () {
    beforeEach(() => {
      return subject.pushData(dataOffSite);
    });

    it('renders anti-tracking box', function () {
      chai.expect(subject.query('#anti-tracking')).to.exist;
    });

    describe("click on antitracking switch", function () {
      updateGeneralStateTest('#anti-tracking .antitracking .cqz-switch-box', 'active');

      it('sends message to activate antitracking', function () {
        subject.query('#anti-tracking .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "antitracking-activator")
        ).then(
          message => {
            chai.expect(message).to.have.deep.property("message.data.type", "switch");
            chai.expect(message).to.have.deep.property("message.data.state", "active");
            chai.expect(message).to.have.deep.property("message.data.status", "active");
            chai.expect(message).to.have.deep.property("message.data.hostname", dataOffSite.hostname);
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
            message => {
             chai.expect(message).to.have.deep.property('message.data.type', 'off_select');
             chai.expect(message).to.have.deep.property('message.data.state', 'off_all');
             chai.expect(message).to.have.deep.property('message.data.status', 'critical');
             chai.expect(message).to.have.deep.property('message.data.hostname', dataOffSite.hostname);
            }
          );
        });
      });
    });

  });

  describe('with anti-tracking off for all websites', function () {
    beforeEach(() => {
      return subject.pushData(dataOffAll);
    });

    it('renders anti-tracking box', function () {
      chai.expect(subject.query('#anti-tracking')).to.exist;
    });

    describe("click on antitracking switch", function () {
      updateGeneralStateTest('#anti-tracking .antitracking .cqz-switch-box', 'active');

      it('sends message to activate antitracking', function () {
        subject.query('#anti-tracking .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "antitracking-activator")
        ).then(
          message => {
            chai.expect(message).to.have.deep.property("message.data.type", "switch");
            chai.expect(message).to.have.deep.property("message.data.state", "active");
            chai.expect(message).to.have.deep.property("message.data.status", "active");
            chai.expect(message).to.have.deep.property("message.data.hostname", dataOffAll.hostname);
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
            message => {
             chai.expect(message).to.have.deep.property('message.data.type', 'off_select');
             chai.expect(message).to.have.deep.property('message.data.state', 'off_website');
             chai.expect(message).to.have.deep.property('message.data.status', 'inactive');
             chai.expect(message).to.have.deep.property('message.data.hostname', dataOffAll.hostname);
            }
          );
        });
      });
    });
  });
};

describe('Control Center: Anti-Tracking interaction browser', function () {
  antitrackingInteractionTests(false);
});

describe('Control Center: AMO, Anti-Tracking Interaction tests', function () {
  antitrackingInteractionTests(true);
})
