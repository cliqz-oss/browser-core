/* global chai */
/* global describeModule */
/* global require */

export default describeModule('hpn/send-message',
  function () {
    return {
      './main': { default: {} },
      './crypto-worker': { default: {} },
    };
  },

  () => {

    const expect = chai.expect;

    // creates a well-formed test messages
    function mkMessage(text) {
      return {
        data: {
        },
        _debugId: text
      };
    }

    function mkUniqueMessage() {
      if (!mkUniqueMessage._counter) {
        mkUniqueMessage._counter = 0;
      }
      mkUniqueMessage._counter += 1;
      return mkMessage(`test-message-${mkUniqueMessage._counter}`);
    };

    // returns an array with the given number of unique messages
    function mkBatchOfMessage(numMessages) {
      return [...Array(numMessages).keys()].map(mkUniqueMessage);
    }

    describe('Message Sender', () => {

      let uut;

      let MessageSender;
      let _CliqzSecureMessage;

      // Mocks the web worker. Instead of sending HTTP
      // messages, it logs them into the fakeWorker object.
      let fakeWorker;
      class FakeCryptoWorker {
        postMessage(msg) {
          if (!msg) {
            throw new Error('Rejecting broken message');
          }
          fakeWorker.receivedMessages.push(msg);
          const response = {
            data: {
              type: msg.type,
              localTemporalUniq: msg.localTemporalUniq
            }
          };

          setTimeout(() => {
            this.onmessage(response);
          }, fakeWorker.messageDelayInMs());
        }

        terminate() {
          fakeWorker.terminate = true;
        }
      }
      const expectMessageWasSent = function expectMessageWasSent(message) {
        const messageFound = fakeWorker.receivedMessages.some(
          sentMsg => sentMsg.msg && sentMsg.msg._debugId === message._debugId);

        if (!messageFound) {
          expect.fail('', '', `message with id '${message._debugId}' was not sent`);
        }
      };

      beforeEach(function () {
        MessageSender = this.module().default;

        fakeWorker = {
          receivedMessages: [],
          terminate: false,
          messageDelayInMs: () => 0 // unless overwritten, there should be no delay
        };

        _CliqzSecureMessage = {
          debug: false,
          storage: {
            saveLocalCheckTable: function saveLocalCheckTable() {
              _CliqzSecureMessage.storage.saveLocalCheckTable._wasCalled = true;
            }
          },
          localTemporalUniq: {}
        };

        uut = new MessageSender({
          _CliqzSecureMessage,
          CryptoWorker: FakeCryptoWorker
        });
      });

      afterEach(function () {
        return uut.stop({ quick: true });
      });

      it('should handle an empty list of messages', () => {
        return uut.send([]).then(() => {
          expect(fakeWorker.receivedMessages).to.be.empty;
        });
      });

      it('should successfully send one message', () => {
        const msg = mkMessage();

        return uut.send([msg]).then(() => {
          expect(fakeWorker.receivedMessages).to.have.lengthOf(1);
        });
      });

      it('should resolve the promise even if messages are broken', () => {
        const broken1 = undefined;
        const goodMsg1 = mkMessage('good1');
        const broken2 = undefined;
        const goodMsg2 = mkMessage('good2');
        const broken3 = undefined;

        // Actual behavior is undefined (whether all messages are
        // passed to the worker or immediately rejected).
        //
        // What is important, is that promise gets fullfilled,
        // and sending must not stop after a broken message
        // was sent.
        //
        return uut.send([broken1, goodMsg1, broken2, goodMsg2, broken3]).then(() => {
          expectMessageWasSent(goodMsg1);
          expectMessageWasSent(goodMsg2);
        });
      });

      it('should update storage after sending a telemetry message', () => {
        const telemetryMsg = mkMessage();
        telemetryMsg.data.type = 'telemetry';
        _CliqzSecureMessage.storage.saveLocalCheckTable._wasCalled = false;

        return uut.send([telemetryMsg]).then(() => {
          expect(_CliqzSecureMessage.storage.saveLocalCheckTable._wasCalled).to.be.true;
        });
      });

      it('should terminate the worker if stop is called', () => {
        fakeWorker.terminate = false;
        return uut.stop().then(() => {
          expect(fakeWorker.terminate).to.be.true;
        });
      });

      it('should handle many messages (no delay)', () => {
        const batch1 = mkBatchOfMessage(100);
        const batch2 = mkBatchOfMessage(70);
        const batch3 = mkBatchOfMessage(0);
        const batch4 = mkBatchOfMessage(30);

        const promise1 = uut.send(batch1);
        const promise2 = uut.send(batch2);
        const promise3 = uut.send(batch3);
        const promise4 = uut.send(batch4);

        console.log(fakeWorker.receivedMessages);
        return Promise.all([
          promise1.then(() => expect(fakeWorker.receivedMessages.length).to.be.at.least(100)),
          promise2.then(() => expect(fakeWorker.receivedMessages.length).to.be.at.least(170)),
          promise3.then(() => expect(fakeWorker.receivedMessages.length).to.be.at.least(170)),
          promise4.then(() => expect(fakeWorker.receivedMessages).to.have.lengthOf(200))]);
      });

      it('should handle many messages (with delay)', () => {
        fakeWorker.messageDelayInMs = () => {
          return Math.floor(Math.random() * 10);
        };

        const batch1 = mkBatchOfMessage(3);
        const batch2 = mkBatchOfMessage(2);
        const batch3 = mkBatchOfMessage(0);
        const batch4 = mkBatchOfMessage(5);

        const promise1 = uut.send(batch1);
        const promise2 = uut.send(batch2);
        const promise3 = uut.send(batch3);
        const promise4 = uut.send(batch4);

        return Promise.all([
          promise1.then(() => expect(fakeWorker.receivedMessages.length).to.be.at.least(3)),
          promise2.then(() => expect(fakeWorker.receivedMessages.length).to.be.at.least(5)),
          promise3.then(() => expect(fakeWorker.receivedMessages.length).to.be.at.least(5)),
          promise4.then(() => expect(fakeWorker.receivedMessages).to.have.lengthOf(10))]);
      });

      it('should support to call stop multiple times', () => {
        return uut.stop()
          .then(() => uut.stop())
          .then(() => uut.stop({ quick: true }))
          .then(() => uut.stop())
          .then(() => uut.stop({ quick: true }));
      });

      it('should support immediate shutdown', () => {
        return uut.stop({ quick: true }).then(() => {
          expect(fakeWorker.terminate).to.be.true;
        });
      });
    });
  }
);
