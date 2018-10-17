import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { generateDataStrictFalse, generateDataStrictTrue } from './fixtures/antitracking-trackers';

function trackersTests(amo) {
  const dataStrictFalse = generateDataStrictFalse(amo);
  const dataStrictTrue = generateDataStrictTrue(amo);
  const target = 'control-center';
  let subject;

  beforeEach(function () {
    subject = new Subject();
  });

  afterEach(function () {
    subject.unload();
  });

  describe('pushing data with Strict == false', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataStrictFalse
      });
      return subject.load();
    });

    it('anti-tracking section exists', function () {
      expect('#anti-tracking.antitracker.setting').to.exist;
      expect('#anti-tracking .hover-highlighted').to.exist;
    });

    describe('click on Anti-tracking', function () {
      beforeEach(function () {
        subject.query('#anti-tracking .hover-highlighted').click();
        return waitFor(() => subject.query('#anti-tracking.antitracker.setting').classList.contains('active'));
      });

      it('renders box for "Strict"', function () {
        expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour')).to.exist;
      });

      it('box is unchecked', function () {
        expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').checked).to.equal(false);
      });

      it('click on box for "Strict" - sends message to update state', function () {
        subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'antitracking-strict')
        ).then(
          (message) => {
            expect(message).have.nested.property('args[0].status', true);
            expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').checked).to.equal(true);
          }
        );
      });

      it('renders button "Clear Tracking Cache"', function () {
        const buttonSelector = '.active-window-tracking #bottom-part .clear-Tracking-Cache-Button';
        expect(subject.query(buttonSelector)).to.exist;
      });

      it('click on "Clear Tracking Cache" - sends message', function () {
        subject.query('.active-window-tracking #bottom-part .clear-Tracking-Cache-Button').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'antitracking-clearcache')
        );
      });
    });
  });

  describe('pushing data with Strict == true', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataStrictTrue
      });
      return subject.load();
    });

    it('anti-tracking section exists', function () {
      expect('#anti-tracking.antitracker.setting').to.exist;
      expect('#anti-tracking .hover-highlighted').to.exist;
    });

    describe('click on Anti-tracking', function () {
      beforeEach(function () {
        subject.query('#anti-tracking .hover-highlighted').click();
        return waitFor(() => subject.query('#anti-tracking.antitracker.setting').classList.contains('active'));
      });

      it('renders box for "Strict"', function () {
        expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour')).to.exist;
      });

      it('box is checked', function () {
        expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').checked).to.equal(true);
      });

      it('click on box for "Strict" - sends message to update state', function () {
        subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'antitracking-strict')
        ).then(
          (message) => {
            expect(message).have.nested.property('args[0].status', false);
            expect(subject.query('.active-window-tracking #bottom-part .squaredFour #squaredFour').checked).to.equal(false);
          }
        );
      });

      it('renders button "Clear Tracking Cache"', function () {
        const buttonSelector = '.active-window-tracking #bottom-part .clear-Tracking-Cache-Button';
        expect(subject.query(buttonSelector)).to.exist;
      });

      it('click on "Clear Tracking Cache" - sends message', function () {
        subject.query('.active-window-tracking #bottom-part .clear-Tracking-Cache-Button').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'antitracking-clearcache')
        );
      });
    });
  });
}

describe('Control Center: Anti-Tracking, page with trackers, Interaction browser', function () {
  trackersTests(false);
});

describe('Control Center: AMO, Anti-Tracking, page with trackers Interaction tests', function () {
  trackersTests(true);
});
