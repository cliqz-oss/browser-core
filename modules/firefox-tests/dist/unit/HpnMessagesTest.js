"use strict";

var expect = chai.expect;
TESTS.HPNMessagesTest = function (CliqzUtils) {
	var CliqzSecureMessage = CliqzUtils.getWindow().CLIQZ.System.get("hpn/main").default;
	function makeSampleMessage() {
		return `{"action": "test-message", "type": "humanweb", "ver": "0", "anti-duplicates": ${Math.floor(Math.random() * 1000000000)}, "payload": {"t": "${getTodayDateMinutes()}"}, "ts": "${getTodayDate()}"}`;
	}
	function getTodayDate() {
		return (new Date()).toISOString().slice(0,10).replace(/-/g,"");
	}
	function getTodayDateMinutes() {
		return (new Date()).toISOString().slice(0,19).replace(/[-T:]/g,"");
	}
	var sample_message = makeSampleMessage();
	describe("Monitoring test", function () {
		it("Proxies loaded", function () {
			var l = CliqzSecureMessage.proxyList.length;
			expect(l).to.be.at.least(1);
		});

		it("load message in trk", function () {
			expect(CliqzSecureMessage.trk.length).to.equal(0);
			CliqzSecureMessage.trk.push(JSON.parse(sample_message));
			expect(CliqzSecureMessage.trk.length).to.equal(1);
		});

		it("send message, should be accepted by server", function (){
			expect(CliqzSecureMessage.trk.length).to.equal(1);
			return CliqzSecureMessage.pushTelemetry()
			.then(results => {
				expect(results.length).to.equal(1);
				expect(results[0]).to.be.null;
				expect(CliqzSecureMessage.trk.length).to.equal(0);
			});
		});

		it("send message, should be dropped locally (duplicate)", function (){
			expect(CliqzSecureMessage.trk.length).to.equal(0);
			CliqzSecureMessage.trk.push(JSON.parse(sample_message));
			return CliqzSecureMessage.pushTelemetry()
			.then(results => {
				expect(results.length).to.equal(1);
				expect(results[0]).to.equal('dropped-local-check');
				expect(CliqzSecureMessage.trk.length).to.equal(0);
			});
		});

		it("send message, should be dropped in the proxy (duplicate)", function () {
			expect(CliqzSecureMessage.trk.length).to.equal(0);
			CliqzSecureMessage.trk.push(JSON.parse(sample_message));
			CliqzSecureMessage.localTemporalUniq = {};
			return CliqzSecureMessage.pushTelemetry()
			.then(results => {
				expect(results.length).to.equal(1);
				expect(results[0]).to.equal('error-promise-failed');
				expect(CliqzSecureMessage.trk.length).to.equal(0);
			});
		});

		it("send multiple messages, some failing, some not", function () {
			this.timeout(10000);
			var msg1 = makeSampleMessage();
			var msg2 = makeSampleMessage();
			expect(CliqzSecureMessage.trk.length).to.equal(0);
			CliqzSecureMessage.trk.push(JSON.parse(msg1));
			CliqzSecureMessage.trk.push(JSON.parse(msg1));
			CliqzSecureMessage.trk.push(JSON.parse(msg1));
			CliqzSecureMessage.trk.push(JSON.parse(msg2));
			CliqzSecureMessage.trk.push(JSON.parse(msg2));
			CliqzSecureMessage.trk.push(JSON.parse(msg2));
			return CliqzSecureMessage.pushTelemetry()
			.then(results => {
				expect(results.length).to.equal(6);
				expect(results[0]).to.be.null;
				expect(results[1]).to.equal('dropped-local-check');
				expect(results[2]).to.equal('dropped-local-check');
				expect(results[3]).to.be.null;
				expect(results[4]).to.equal('dropped-local-check');
				expect(results[5]).to.equal('dropped-local-check');
				expect(CliqzSecureMessage.trk.length).to.equal(0);
			});
		});
	});


}

TESTS.HPNMessagesTest.MIN_BROWSER_VERSION = 41;

