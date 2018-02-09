import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import {dataOn, dataOff} from './fixtures/https-everywhere';

describe('Control Center: HTTPS Everywhere interaction browser', function () {
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
        message => chai.expect(message).to.have.deep.property('message.data', 'active')
      );
    });
  };

  it('loads', function () {
    chai.expect(true).to.eql(true);
  })

  describe('with https everywhere on', function () {
    beforeEach(() => {
      return subject.pushData(dataOn);
    });

    it('renders https box', function () {
      chai.expect(subject.query('#https')).to.exist;
    });

    describe('click on https switch', function () {
      updateGeneralStateTest('#https .cqz-switch-box');

      it('sends message to deactivate https', function () {
        subject.query('#https .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'updatePref')
        ).then(
          message => {
            chai.expect(message).to.have.deep.property('message.data.pref', 'extensions.https_everywhere.globalEnabled');
            chai.expect(message).to.have.deep.property('message.data.value', false);
            chai.expect(message).to.have.deep.property('message.data.target', 'https_switch');
          }
        );
      });
    });
  });

  describe('with https everywhere off', function () {
    beforeEach(() => {
      return subject.pushData(dataOff);
    });

    it('renders https box', function () {
      chai.expect(subject.query('#https')).to.exist;
    });

    describe('click on https switch', function () {
      updateGeneralStateTest('#https .cqz-switch-box');

      it('sends message to activate https', function () {
        subject.query('#https .cqz-switch-box').click();

        return waitFor(
          () => subject.messages.find(message => message.message.action === 'updatePref')
        ).then(
          message => {
            chai.expect(message).to.have.deep.property('message.data.pref', 'extensions.https_everywhere.globalEnabled');
            chai.expect(message).to.have.deep.property('message.data.value', true);
            chai.expect(message).to.have.deep.property('message.data.target', 'https_switch');
          }
        );
      });
    });
  });
})
