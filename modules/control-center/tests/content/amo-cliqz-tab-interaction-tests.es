import {
  clearIntervals,
  expect,
  Subject,
  waitFor
} from '../../core/test-helpers';

import { dataOn, dataOff } from './fixtures/amo-cliqz-tab';

describe('Control Center: AMO, Cliqz tab interaction tests', function () {
  let subject;
  const buildUrl = '/build/cliqz@cliqz.com/chrome/content/control-center/index.html';
  const target = 'cliqz-control-center';

  beforeEach(function () {
    subject = new Subject();
    return subject.load(buildUrl);
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

  describe('with Cliqz tab on', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOn);
    });

    it('renders cliqz tab box', function () {
      expect(subject.query('.amo #cliqz-tab')).to.exist;
    });

    describe('click on cliqz tab switch', function () {
      updateGeneralStateTest('.amo #cliqz-tab .cqz-switch-box');

      it('sends message to deactivate cliqz tab', function () {
        subject.query('.amo #cliqz-tab .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'cliqz-tab')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.status', false);
          }
        );
      });
    });
  });

  describe('with Cliqz tab off', function () {
    beforeEach(function () {
      return subject.pushData(target, dataOff);
    });

    it('renders cliqz tab box', function () {
      expect(subject.query('.amo #cliqz-tab')).to.exist;
    });

    describe('click on cliqz tab switch', function () {
      updateGeneralStateTest('.amo #cliqz-tab .cqz-switch-box');

      it('sends message to activate cliqz tab', function () {
        subject.query('.amo #cliqz-tab .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'cliqz-tab')
        ).then(
          (message) => {
            expect(message).to.have.nested.property('message.data.status', true);
          }
        );
      });
    });
  });
});
