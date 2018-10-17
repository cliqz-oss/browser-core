import {
  expect,
  waitFor,
} from '../../core/test-helpers';
import Subject from './local-helpers';
import { dataOn, dataOff } from './fixtures/https-everywhere';

describe('Control Center: HTTPS Everywhere interaction browser', function () {
  let subject;
  const target = 'control-center';

  beforeEach(function () {
    subject = new Subject();
  });

  afterEach(function () {
    subject.unload();
  });

  function updateGeneralStateTest(selector) {
    it('sends message to update general state', function () {
      subject.query(selector).click();

      return waitFor(
        () => subject.messages.find(message => message.action === 'updateState')
      ).then(
        message => expect(message).to.have.property('args').that.deep.equals(['active'])
      );
    });
  }

  describe('with https everywhere on', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOn
      });
      return subject.load();
    });

    it('renders https box', function () {
      expect(subject.query('#https')).to.exist;
    });

    describe('click on https switch', function () {
      updateGeneralStateTest('#https .cqz-switch-box');

      it('sends message to deactivate https', function () {
        subject.query('#https .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'updatePref')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('args[0].pref', 'extensions.https_everywhere.globalEnabled');
            expect(message).to.have.nested.property('args[0].value', false);
            expect(message).to.have.nested.property('args[0].target', 'https_switch');
          }
        );
      });
    });
  });

  describe('with https everywhere off', function () {
    beforeEach(function () {
      subject.respondsWith({
        module: target,
        action: 'getData',
        response: dataOff
      });
      return subject.load();
    });

    it('renders https box', function () {
      expect(subject.query('#https')).to.exist;
    });

    describe('click on https switch', function () {
      updateGeneralStateTest('#https .cqz-switch-box');

      it('sends message to activate https', function () {
        subject.query('#https .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.action === 'updatePref')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('args[0].pref', 'extensions.https_everywhere.globalEnabled');
            expect(message).to.have.nested.property('args[0].value', true);
            expect(message).to.have.nested.property('args[0].target', 'https_switch');
          }
        );
      });
    });
  });
});
