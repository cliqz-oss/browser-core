/* global chai */
/* global describeModule */
/* global require */

class FakeMessageContext {
  query(...args) {
    return FakeMessageContext._query(...args);
  }

  encryptedTelemetry(...args) {
    return FakeMessageContext._encryptedTelemetry(...args);
  }
}

const fakeBlindSignature = {
  parseDSKey: function(...args) {
    return fakeBlindSignature._parseDSKey(...args);
  }
};

export default describeModule('hpn/worker/index',
  function () {
    return {
      './message-context': {
        default: FakeMessageContext
      },
      '../../core/crypto/utils': { default: {} },
      'md5': { default: {} },
      'bigint': { default: {} },
      './user-pk': { default: {} },
      './blind-signature': {
        parseDSKey: function(...args) {
          return fakeBlindSignature._parseDSKey(...args);
        },
        default: {
          parseDSKey: function(...args) {
            return fakeBlindSignature._parseDSKey(...args);
          },
        }
      },
      '../../core/config': {
        default: {
          settings: {
            ENDPOINT_BLIND_SIGNER: 'fake_ENDPOINT_BLIND_SIGNER',
            ENDPOINT_USER_REG: 'fake_ENDPOINT_USER_REG',
          }
        }
      },
    };
  },

  () => {

    function mkMessage(type) {
      return {
        data: {
          type,
          msg: 'some-message-content'
        }
      };
    }

    function mkInstantMessage(uid) {
      if (uid === undefined) {
        uid = 1;
      }
      return {
        data: {
          type: 'instant',
          msg: 'some-instant-message-content',
          uid
        }
      };
    }

    function mkTelemetryMessage() {
      return {
        data: {
          type: 'telemetry',
          msg: 'some-instant-message-content'
        }
      };
    }

    const oldGlobal = {};
    let postMessageHook;

    // override global variables
    before(function () {
      oldGlobal.self = global.self;
      global.self = {};

      oldGlobal.postMessage = global.postMessage;
      global.postMessage = (msg) => postMessageHook(msg);
    });

    // cleanup: restore global variables
    after(function () {
      global.self = oldGlobal.originalSelf;
      global.postMessage = oldGlobal.postMessage;
    });

    // reset hooks:
    beforeEach(function () {

      // do nothing (ignore outgoing response messages)
      postMessageHook = () => {};

      // by default, queries always succeed
      FakeMessageContext._query = () => Promise.resolve();
      FakeMessageContext._encryptedTelemetry = () => Promise.resolve();

      // by default, always succeeds
      // (but without the expected side-effect of
      //  initializing CliqzSecureMessage.dsPK)
      fakeBlindSignature._parseDSKey = () => Promise.resolve();
    });

    after(function () {
      global.self = oldGlobal.originalSelf;
      global.postMessage = oldGlobal.postMessage;
    });

    beforeEach(function () {
      postMessageHook = () => {};
    });

    const expect = chai.expect;

    describe('Crypto Worker', () => {

      it('should response after sending an instant message', (done) => {
        const inputMsg = mkInstantMessage();

        const serverResponse = 'some dummy response';
        FakeMessageContext._query = () => {
          return Promise.resolve(serverResponse);
        };

        // send message and expect that a response is sent
        postMessageHook = (msg) => {
          try {
            expect(msg.type).to.equal('instant');
            expect(msg.res).to.equal(serverResponse);
            expect(msg.uid).to.equal(inputMsg.data.uid);
            done();
          } catch (e) {
            done(e);
          }
        };
        self.onmessage(inputMsg);
      });

      it('should respond even if sending an instant message fails', (done) => {
        const someMsg = mkInstantMessage();

        // scenario: sending messages should fail
        FakeMessageContext._query = () => Promise.reject();

        // send message and expect that a response is sent
        postMessageHook = () => done();
        self.onmessage(someMsg);
      });

      it('should respond after sending a telemetry message', (done) => {
        const inputMsg = mkTelemetryMessage();

        // send message and expect that a response is sent
        postMessageHook = (msg) => {
          try {
            expect(msg.type).to.equal('telemetry', msg);
            expect(msg.uid).to.equal(inputMsg.data.uid);
            done();
          } catch (e) {
            done(e);
          }
        };
        self.onmessage(inputMsg);
      });

      it('should respond even if sending an telemetry message fails', (done) => {
        const someMsg = mkTelemetryMessage();

        // scenario: sending messages should fail
        FakeMessageContext._encryptedTelemetry = () => Promise.reject();

        // send message and expect that a response is sent
        postMessageHook = () => done();
        self.onmessage(someMsg);
      });

      it('should respond if an unknown message type is received', (done) => {
        const msg = {
          data: {
            type: 'unknown-message-type'
          }
        };

        // send message and expect that a response is sent
        postMessageHook = () => done();
        self.onmessage(msg);
      });

      it('should send all messages even if messages overtake each other', (done) => {

        const expectedInstantMessageIds = [];
        let expectedTelemetryCounter = 0;

        // Generate a bunch of instant messages
        // (which have an id) and telemetry messages.
        const allInputMessages = [];
        [...Array(2).keys()].forEach(uid => {
          allInputMessages.push(mkInstantMessage(uid));
          allInputMessages.push(mkTelemetryMessage());

          expectedInstantMessageIds.push(uid);
          expectedTelemetryCounter += 1;
        });

        // scenario: delay every second message
        let delayCounter = 0;
        FakeMessageContext._query = () => {
          return new Promise((resolve, reject) => {
            if ((delayCounter++ % 2) === 0) {
              setTimeout(() => resolve(), 1);
            } else {
              resolve();
            }
          });
        };

        let receivedCounter = 0;
        let telemetryCounter = 0;
        const receivedInstantMessageIds = [];

        postMessageHook = (msg) => {
          try {
            receivedCounter += 1;

            if (msg.type === 'telemetry') {
              telemetryCounter += 1;
            } else if (msg.type === 'instant') {
              expect(expectedInstantMessageIds).to.include(msg.uid);
              receivedInstantMessageIds.push(msg.uid);
            } else {
              expect.fail('', '', `received unexpected message '${msg}'`);
            }

            if (receivedCounter == allInputMessages.length) {
              expect(receivedInstantMessageIds).to.have.members(expectedInstantMessageIds);
              expect(telemetryCounter).to.equal(expectedTelemetryCounter);
              done();
            }
          } catch (e) {
            done(e);
          }
        };

        allInputMessages.forEach(self.onmessage);
      });
    });
  }
);
