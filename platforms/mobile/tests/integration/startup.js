describe("Startup", function () {
  var testBox;

  beforeEach(function () {
    // startup can be quite slow for the first time. Maybe there is better way
    // to warm it up.
    this.timeout(10000);
    testBox = document.createElement("iframe");
    testBox.setAttribute("class", "testFrame");
    testBox.src =   "/build/index.html";
    document.body.appendChild(testBox);


    contentWindow = testBox.contentWindow;

    function waitForWindow(win) {
      return new Promise(function (res) {
        win.osAPI.isReady = function () { res(); };
      });
    }

    return new Promise(function (resolve) {
      contentWindow.onload = resolve;
    }).then(function () {
      return Promise.all([
        injectSinon(contentWindow)
      ])
    }).then(function () {
      fakeServer = sinon.fakeServer.create({
        autoRespond: true,
        respondImmediately: true
      });
      contentWindow.sinon.FakeXMLHttpRequest.addFilter(function (method, url) { return url.indexOf('api/v2') === -1 });
      contentWindow.sinon.FakeXMLHttpRequest.useFilters = true;
      contentWindow.sinonLoaded = true;
      return waitForWindow(contentWindow);
    });
  });

  afterEach(function () {
    localStorage.clear();
    fakeServer.restore();
    document.body.removeChild(testBox);
  });

  context("Language loading", function () {

    beforeEach(function () {
      contentWindow.CliqzUtils.locale = {};
    });

    it("should load default language if locale is not recognized", function () {
      contentWindow.CliqzUtils.setLang('it-IT');

      expect(contentWindow.CliqzUtils.locale['it-IT']).to.be.not.ok;
      expect(contentWindow.CliqzUtils.locale.it).to.be.not.ok;
      expect(contentWindow.CliqzUtils.locale.de).to.be.not.ok;
      expect(contentWindow.CliqzUtils.locale.en).to.be.ok;
      expect(contentWindow.CliqzUtils.locale.default).to.be.ok;
    });
  });
});
