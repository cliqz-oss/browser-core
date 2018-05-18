import {
  clearIntervals,
  expect,
  waitFor
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataOn, dataOff } from './fixtures/https-everywhere';

describe('Control Center: HTTPS Everywhere interaction browser', function () {
  let subject;
  const target = 'cliqz-control-center';

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

  describe('with https everywhere on', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOn);
    });

    it('renders https box', function () {
      expect(subject.query('#https')).to.exist;
    });

    describe('click on https switch', function () {
      updateGeneralStateTest('#https .cqz-switch-box');

      it('sends message to deactivate https', function () {
        subject.query('#https .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'updatePref')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.pref', 'extensions.https_everywhere.globalEnabled');
            expect(message).to.have.nested.property('message.data.value', false);
            expect(message).to.have.nested.property('message.data.target', 'https_switch');
          }
        );
      });
    });
  });

  describe('with https everywhere off', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOff);
    });

    it('renders https box', function () {
      expect(subject.query('#https')).to.exist;
    });

    describe('click on https switch', function () {
      updateGeneralStateTest('#https .cqz-switch-box');

      it('sends message to activate https', function () {
        subject.query('#https .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'updatePref')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.pref', 'extensions.https_everywhere.globalEnabled');
            expect(message).to.have.nested.property('message.data.value', true);
            expect(message).to.have.nested.property('message.data.target', 'https_switch');
          }
        );
      });
    });
  });
});
