/* global expect, TESTS */
/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-unused-expressions: 'off' */

TESTS.HPNMonitoringTest = function (CliqzUtils) {
  const CliqzSecureMessage = CliqzUtils.getWindow().CliqzSecureMessage;

  function getTodayDate() {
    return (new Date()).toISOString().slice(0, 10).replace(/-/g, '');
  }
  function getTodayDateMinutes() {
    return (new Date()).toISOString().slice(0, 19).replace(/[-T:]/g, '');
  }
  function makeSampleMessage() {
    return `{"action": "test-message", "type": "humanweb", "ver": "0", "anti-duplicates": ${Math.floor(Math.random() * 1000000000)}, "payload": {"t": "${getTodayDateMinutes()}"}, "ts": "${getTodayDate()}"}`;
  }

  const sampleMessage = makeSampleMessage();
  describe('HPN monitoring test', function () {
    it('Proxies loaded', function () {
      const l = CliqzSecureMessage.proxyList.length;
      expect(l).to.be.at.least(1);
    });

    it('send message, should be accepted by server', function () {
      expect(CliqzSecureMessage.trk.length).to.equal(0);
      CliqzSecureMessage.trk.push(JSON.parse(sampleMessage));
      expect(CliqzSecureMessage.trk.length).to.equal(1);

      return CliqzSecureMessage.pushTelemetry()
        .then(() => {
          expect(CliqzSecureMessage.trk.length).to.equal(0);
        });
    });

    it('send message, should be dropped locally (duplicate)', function () {
      expect(CliqzSecureMessage.trk.length).to.equal(0);
      CliqzSecureMessage.trk.push(JSON.parse(sampleMessage));
      return CliqzSecureMessage.pushTelemetry()
        .then(() => {
          expect(CliqzSecureMessage.trk.length).to.equal(0);
        });
    });

    it('send message, should be dropped in the proxy (duplicate)', function () {
      expect(CliqzSecureMessage.trk.length).to.equal(0);
      CliqzSecureMessage.trk.push(JSON.parse(sampleMessage));
      CliqzSecureMessage.localTemporalUniq = {};
      return CliqzSecureMessage.pushTelemetry()
        .then(() => {
          expect(CliqzSecureMessage.trk.length).to.equal(0);
        });
    });

    it('send multiple messages, some failing, some not', function () {
      this.timeout(10000);
      const msg1 = makeSampleMessage();
      const msg2 = makeSampleMessage();
      expect(CliqzSecureMessage.trk.length).to.equal(0);
      CliqzSecureMessage.trk.push(JSON.parse(msg1));
      CliqzSecureMessage.trk.push(JSON.parse(msg1));
      CliqzSecureMessage.trk.push(JSON.parse(msg1));
      CliqzSecureMessage.trk.push(JSON.parse(msg2));
      CliqzSecureMessage.trk.push(JSON.parse(msg2));
      CliqzSecureMessage.trk.push(JSON.parse(msg2));
      return CliqzSecureMessage.pushTelemetry()
        .then(() => {
          expect(CliqzSecureMessage.trk.length).to.equal(0);
        });
    });
  });
};

TESTS.HPNMonitoringTest.MIN_BROWSER_VERSION = 41;
