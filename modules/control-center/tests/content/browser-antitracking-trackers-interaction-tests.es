import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import {generateDataStrictFalse, generateDataStrictTrue} from './fixtures/antitracking-trackers';

function trackersTests(amo) {
  const dataStrictFalse = generateDataStrictFalse(amo);
  const dataStrictTrue = generateDataStrictTrue(amo);
  let subject;

  beforeEach(function () {
    subject = new Subject();
    return subject.load();
  })

  afterEach(function () {
    subject.unload();
    clearIntervals();
  });

  it('loads', function () {
    chai.expect(true).to.eql(true);
  });

  describe('pushing data with Strict == false', function () {
    beforeEach(() => {
      return subject.pushData(dataStrictFalse);
    });

    it('anti-tracking section exists', function () {
      chai.expect('#anti-tracking.antitracker.setting').to.exist;
      chai.expect('#anti-tracking .hover-highlighted').to.exist;
    });

    describe('click on Anti-tracking', function () {
      beforeEach(function () {
        subject.query('#anti-tracking .hover-highlighted').click();
        return waitFor(() => subject.query('#anti-tracking.antitracker.setting').classList.contains('active'));
      });

      it('renders box for "Strict"', function () {
        chai.expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour')).to.exist;
      });

      it('box is unchecked', function () {
        chai.expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').checked).to.equal(false);
      });

      it('click on box for "Strict" - sends message to update state', function () {
        subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "antitracking-strict")
        ).then(
          message => {
            chai.expect(message).to.have.nested.property("message.data.status", true);
            chai.expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').checked).to.equal(true);
          }
        );
      });

      it('renders button "Clear Tracking Cache"', function () {
        const buttonSelector = '.active-window-tracking #bottom-part .clear-Tracking-Cache-Button';
        chai.expect(subject.query(buttonSelector)).to.exist;
      });

      it('click on "Clear Tracking Cache" - sends message', function () {
        subject.query('.active-window-tracking #bottom-part .clear-Tracking-Cache-Button').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'antitracking-clearcache')
        )
      });
    });
  });

  describe('pushing data with Strict == true', function () {
    beforeEach(() => {
      return subject.pushData(dataStrictTrue);
    });

    it('anti-tracking section exists', function () {
      chai.expect('#anti-tracking.antitracker.setting').to.exist;
      chai.expect('#anti-tracking .hover-highlighted').to.exist;
    });

    describe('click on Anti-tracking', function () {
      beforeEach(function () {
        subject.query('#anti-tracking .hover-highlighted').click();
        return waitFor(() => subject.query('#anti-tracking.antitracker.setting').classList.contains('active'));
      });

      it('renders box for "Strict"', function () {
        chai.expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour')).to.exist;
      });

      it('box is checked', function () {
        chai.expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').checked).to.equal(true);
      });

      it('click on box for "Strict" - sends message to update state', function () {
        subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === "antitracking-strict")
        ).then(
          message => {
            chai.expect(message).to.have.nested.property("message.data.status", false);
            chai.expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').checked).to.equal(false);
          }
        );
      });

      it('renders button "Clear Tracking Cache"', function () {
        const buttonSelector = '.active-window-tracking #bottom-part .clear-Tracking-Cache-Button';
        chai.expect(subject.query(buttonSelector)).to.exist;
      });

      it('click on "Clear Tracking Cache" - sends message', function () {
        subject.query('.active-window-tracking #bottom-part .clear-Tracking-Cache-Button').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'antitracking-clearcache')
        )
      });
    });
  });
};

describe('Control Center: Anti-Tracking, page with trackers, Interaction browser', function () {
  trackersTests(false);
});

describe('Control Center: AMO, Anti-Tracking, page with trackers Interaction tests', function () {
  trackersTests(true);
})
