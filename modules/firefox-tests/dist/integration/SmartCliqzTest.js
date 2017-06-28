DEPS.SmartCliqzTest = ["core/utils"];
TESTS.SmartCliqzTest = function (CliqzUtils) {

	function mockSmartCliqz(ez) {
        return new Promise(function (resolve, reject) {
          CliqzUtils.loadResource('chrome://cliqz/content/firefox-tests/EZ/' + ez + '.json', function (req) {
            var json = JSON.parse(req.response);
            respondWith(json);
            resolve();
          });
    });
  }

  describe('SmartCliqz', function(){
    this.retries(1);

  	it('should display spiegel smart cliqz', function () {
      return mockSmartCliqz('spiegel').then(function () {
        fillIn("spiegel");
        return waitForPopup();
      }).then(function () {
    		var title = $cliqzResults().find(".result [data-extra='title']")[0].textContent.trim();
            chai.expect(title.toLowerCase()).to.contain("spiegel");
      });
    });

    it('should display gmx smart cliqz', function () {
      return mockSmartCliqz('gmx.net').then(function () {
        fillIn("gmx.net");
        return waitForPopup();
      }).then(function () {
    		var title = $cliqzResults().find(".result [data-extra='title']")[0].textContent.trim();
            chai.expect(title.toLowerCase()).to.contain("gmx");
      });
    });
  });

};
