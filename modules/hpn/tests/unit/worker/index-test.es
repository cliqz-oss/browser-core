/* global chai */
/* global describeModule */
/* global require */

const WebCrypto = require('node-webcrypto-ossl');
const crypto = new WebCrypto();

const msgTemplate = JSON.parse('{"sourcemap":{"alive":{"keys":["action","payload.t"],"endpoint":"safe-browsing"},"cookie-dropping-watcher":{"keys":["action","anti-duplicates"],"endpoint":"safe-browsing"},"speedial.missinglogos":{"keys":["action","payload.d"],"endpoint":"safe-browsing"},"page":{"keys":["payload.url","ts"],"endpoint":"safe-browsing"},"query":{"keys":["payload.q","ts"],"endpoint":"safe-browsing"},"anon-query":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"ads_A":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"ads_B":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"ads_C":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"anon-ads_A":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"anon-ads_B":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"anon-ads_C":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"snippet":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"anon-snippet":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"snippet2":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"snippet3":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"doorwaypage":{"keys":["action","payload.url","payload.durl"],"endpoint":"safe-browsing"},"linkedin":{"keys":["action","payload.profileLink","ts"],"endpoint":"safe-browsing"},"suspiciousurl":{"keys":["action","payload.qurl","ts"],"endpoint":"safe-browsing"},"maliciousUrl":{"keys":["action","payload.qurl","ts"],"endpoint":"safe-browsing"},"extension-query":{"keys":["ts"],"endpoint":"query"},"extension-result-telemetry":{"keys":["ts"],"endpoint":"query-telemetry"},"attrack.tokens":{"keys":["action","ts","payload"],"endpoint":"safe-browsing"},"attrack.tp_events":{"keys":["action","anti-duplicates","payload.data[0].hostname","payload.data[0].path"],"bkeys":["action","anti-duplicates","payload.data.1.hostname","payload.data.1.path"],"endpoint":"safe-browsing"},"attrack.safekey":{"keys":["action","payload.ts"],"endpoint":"safe-browsing"},"attrack.FP":{"keys":["action","payload.ts"],"endpoint":"safe-browsing"},"attrack.whitelistDomain":{"keys":["action","payload","ts"],"endpoint":"safe-browsing"},"attrack.cookiesPruned":{"keys":["action","ts"],"endpoint":"safe-browsing"},"proxy-health":{"keys":["action","anti-duplicates"],"endpoint":"health-stats"},"test-message":{"keys":["action","anti-duplicates"],"endpoint":"health-stats"},"hw.telemetry.actionstats":{"keys":["action","ts"],"endpoint":"safe-browsing"},"ga-watchdog-experiment":{"keys":["action","ts","payload.r"],"endpoint":"safe-browsing-experiment"},"locdata":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"ads_D":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"usercontext":{"keys":["action","anti-duplicates"],"endpoint":"safe-browsing"},"attrack.breakage":{"keys":["action","payload.data.hostname","payload.data.path","payload.data.url_info.hostname","payload.data.url_info.path"],"endpoint":"safe-browsing"},"attrack.blocked":{"keys":["action","payload.ts"],"endpoint":"safe-browsing"},"sq":{"keys":["action","payload.oq","ts"],"endpoint":"safe-browsing"},"anon-ads_D":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"offers-signal":{"keys":["signal_id","payload","timestamp"],"endpoint":"offers"},"attrack.suspicious":{"keys":["action"],"endpoint":"safe-browsing"},"experiment-sem-own-keyword":{"keys":["action","anti-duplicates"],"endpoint":"safe-browsing"},"ad-ctr":{"keys":["action","anti-duplicates"],"endpoint":"safe-browsing"},"top-stories":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"greenads-inventory":{"keys":["action","anti-duplicates"],"endpoint":"safe-browsing"}},"upk":{"publicKeyB64":"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAub9NGPZGZ6K8i7l795bYKEK1i6AlvL3c2B5pYNEpeFXcnvHgdDP4fbk8Zojt54cnR0cxjhL0D/UoiBa+8BraWwhzPo62wo9M7Sfg+wKSH5wlnTLLfY6fl3ckHmMfDlQ+amSiUIqsgpLXjZtLO7+ZuufjO+G7A0TSxSnauxGpmy3ZjMlugwJWmljnvZkM5du+s+twcZBS+pH4xBhIn+9Ubr/3bqa1qC8Qvt5NiqXYhF8qrijK4wjngzboiwnd4+yVOXk5+4JtlLESdpAmcEjwEOgr5Oa0/SMoPd8tROa31AkmzdruxbVPDKiRFYZWZRv7C1I3mj7cJd8tRwbTMtot0QIDAQAB","privateKey":"MIIEowIBAAKCAQEAub9NGPZGZ6K8i7l795bYKEK1i6AlvL3c2B5pYNEpeFXcnvHgdDP4fbk8Zojt54cnR0cxjhL0D/UoiBa+8BraWwhzPo62wo9M7Sfg+wKSH5wlnTLLfY6fl3ckHmMfDlQ+amSiUIqsgpLXjZtLO7+ZuufjO+G7A0TSxSnauxGpmy3ZjMlugwJWmljnvZkM5du+s+twcZBS+pH4xBhIn+9Ubr/3bqa1qC8Qvt5NiqXYhF8qrijK4wjngzboiwnd4+yVOXk5+4JtlLESdpAmcEjwEOgr5Oa0/SMoPd8tROa31AkmzdruxbVPDKiRFYZWZRv7C1I3mj7cJd8tRwbTMtot0QIDAQABAoIBAAxt46Y6KWEbJgvt5oC3BFHbw0z+wDSBoLrv4tQXfia1c1gWp8YlPO+7KtjsBfD9pA0EYFy5O454NJuFDu1lyDTAbpqO1cxUTUZ7ttwbdbtNwvdihCfFTAj7o1wXlk1qj7g/PnYU2xEfUfM01nNYd9xmhfGADytbbWsqFZ8TW7ETFY0rKmdt5a+e3+NmsuI5T6W4sE3I0U4NKXQlrrS+ayE0IZzBfvrZ0te1SF23etHU12697lQjFrkKojwoGFNz1wrKfIEgUm1Gt/wTALr3lYq6dPbrPQSCvjgGglZiigjuncerCzxdCf0vK9I7h8Y3017Eo58aOwaUpi924OT3yP0CgYEA9nXAS+Fqpx1Zr5CVWYt4y0xthjtDL+6jDotH4+Vg7YZkg1g2gcspCftmDS/qR/2ENbUwFSd4XtceDKca3c9f8ZAbO5UhqojBuXvPICOsklLA14CX1f8Pem5tNiZDR7McTASc8/ZchT2oXYOnxt3rddNK8lxXg2RtGu7yK1QGEZsCgYEAwO/tzjJ5gqMnSzCuYrq02PVQJaJV7ExLUTacdaH8DN4yQ0TaKGzEaClH73sj3KpSGP2/rz+/xJHRqOHlAGkFTsIoV1EXvKMYf67R4hi1Ujl9T7YmgJQymUaSCfstOfaxgOf+MUwXSDatk4/yILMHkJc9Avc1OU1hByoTuWFf+wMCgYBPexPjpLNvZ1C4BKmVchwne+NKSaxWNeBR3Wr2vM9waknZ7cXOP8VhWbjEgfJM+x368A6sk8kG1Nr0+6L3a1wmm/GcWnC7/VR0S9A1LiwGGDfmh6rvsUy9kAUaVGaYJdP3U/mF16poscStO7sMsB6yJczishLq5aUl7W8duAApBwKBgAH0bFxidoi0TnmcjKfDbIGmOqGm+2fhfgHco8ktUvhuZ+P2lp9COtszT99FSB+8Ogi2yXJlGvRK5ezoHQHcDom1veLkl3D51g21H7tCtNOYcYSVO96hocGbzW78dIDZ1wKPVyv4sWOx6iBMnQ9nwPPeFGgrSQbDmfAQpRKDwg0xAoGBALdk2wxK00nxr9kOZPDvbjiprdZ68xxrQhSxQAm5oD5uLfiuEMUF7iJZo8P6QbKPru6o9f3zdK8+cIyEhTTyvgLTfRXtzle3P6rUTEgQYLvZTDdPKFFR2duvRrpfyZhR4bo+zbcr72Dk+hJeATeTeOZ22wOQld9p6L8QyIHpEjvx"},"dspk":{"pubKeyB64":"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwXo4hXvboKHCggNJ0UNFvZQfDWi0jNcF1kBHthxilMu6LB/hFrSMQ+/FgTqVE36cCezWE0K1UcwmYGVsuqxcvql82RfCmYUVBroJ3UFG8qnetYfU5FOk43C555p5l5HzlF8QilcCUBCO4SCj9lEZ3/8FJboCupTqxEUq7nwUgaNZOiGKMdDUBZJO1tW4LSH4lj9IAZccEJ5HKVmJKopQ3hmzWgDqowxni4NQz+0DnsSfCGAupKaJDxjfajJosX5i674rgdHbZGtgHB3M9jhc6HFNPcmtUgLwgtUtRwMhSnya6q/O06euouNi1h0m5eRrWeMRlJSdUnelLSU8QNy7LQIDAQAB"},"sspk":{"publicKeyB64":"MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAh5HhcRAn6+6woXQXl/NtZ+fOooNglZct/HSpYuqkcmrPauHW7EuOSq5bvpBZRTDROjR/kUPomqVZIzqhdCFPA8BwXSCz7hAel2Q157vtBvh9sngMMLXb5Fgzef5N4EuKO8pL5KrS+I9tfZac41vFJSdpgAirZYhh+tdcQQ1z0Qv/Rw0zOXjfvddCz3gEv2gB9KsLMVnTS1J4YOOgfza2adg9Ebz1z99DiF4vtCwn0IUwH/3ToTBwJLbMnC3Ol43yBNk8rgK2mkgCi614vOSD3hnVmio+iW6+AUklM8VPl6l7hEK9cljJY+9UsMVmTrvaFbMPwS6AdZCXKTmNdaMJcy3zSOXu5zvzihoQLwAu9LM3l2eVk0Mw0K7JXOP20fc8BtzWCOLYVP32r4R0BNuhTtvGqjHNZHPJN5OwaxkLpn2dujL9uDWGjRiOItKMVq/nOqmNGghrbf8IOaKT7VQhqOU4cXRkB/uF1UjYETBavwUZAxx9Wd/cMcAGmKiDxighxxQ29jDufl+2WG065tmJz+zCxmgrPh6Zb3KFUxPTe6yksAhWJhmGShA9v20t84M5c6NpZXoUsFcVja6XxzHeSB8dWq9Uu5QcZ83Gz/ronwdEjT2OGTtBgOFeTDqLYUgphC1gcUEHOCnTNXRMQOXqGwBfZHp+Mq61QcMq2rNS7xECAwEAAQ=="},"localTemporalUniq":{}}');

// Some fields (pkeys, etc) required for telemetry messages
function mergeMsgTemplate(msg) {
  Object.keys(msgTemplate).forEach((key) => {
    msg.data[key] = msgTemplate[key];
  });
  return msg;
}

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
      '../../platform/crypto': { default: crypto },
      '../../platform/text-encoder': {
        default: function() {
          return {
            encode: function(s) {
              const buf = Buffer.from(s, 'utf8');
              return buf;
            }
          };
        },
      },
      '../../platform/text-decoder': {
        default: function() {
          return {
            decode: function(s) {
              return Buffer.from(s).toString();
            }
          };
        },
      },
      'md5': { default: {} },
      'BigInt': { default: {} },
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
      return mergeMsgTemplate({
        data: {
          type: 'telemetry',
          msg: 'some-instant-message-content'
        }
      });
    }

    const oldGlobal = {};
    let postMessageHook;

    // override global variables
    before(function () {
      oldGlobal.self = global.self;
      global.self = {};
      global.crypto = {};

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
