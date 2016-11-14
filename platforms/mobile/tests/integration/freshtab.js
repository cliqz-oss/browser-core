describe("Freshtab", function () {
  var testBox, getTopSites;

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
        win.addEventListener('newsLoadingDone', function () { res(); });
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
      newsResponse([]);
      contentWindow.sinon.FakeXMLHttpRequest.addFilter(function (method, url) {return !url.startsWith('https://newbeta.cliqz.com/api/v2/') });
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

  context("display topsites", function () {
    beforeEach(function () {
      contentWindow.osAPI.openLink("http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html");
      contentWindow.osAPI.openLink('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      contentWindow.jsAPI.search();
    });

    it("display 2 top sites from history", function () {
      const topsites = $('.topSitesLink');
      expect(topsites).to.have.length(2);
      expect(topsites[0].getAttribute('url')).to.equal('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      expect(topsites[1].getAttribute('url')).to.equal('http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html');
    });
  });

  context("block 1 of to topsites", function () {
    beforeEach(function () {
      contentWindow.osAPI.openLink("http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html");
      contentWindow.osAPI.openLink('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      contentWindow.jsAPI.search();
      $('.blockTopsite')[0].click();
      $('#doneEditTopsites')[0].click();
      contentWindow.jsAPI.search();
    });

    it("should display 1 website", function () {
      const topsites = $('.topSitesLink');
      expect(topsites).to.have.length(1);
      expect(topsites[0].getAttribute('url')).to.equal('http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html');
    });
  });

  context("Hide blocked topsites forever", function () {
    beforeEach(function () {
      contentWindow.osAPI.openLink("http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html");
      contentWindow.osAPI.openLink('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      contentWindow.jsAPI.search();
      $('.blockTopsite')[0].click();
      $('#doneEditTopsites')[0].click();
      contentWindow.osAPI.openLink('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      contentWindow.jsAPI.search();
    });

    it("should not display the blocked topsite again", function () {
      const topsites = $('.topSitesLink');
      expect(topsites).to.have.length(1);
      expect(topsites[0].getAttribute('url')).to.equal('http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html');
    });
  });

  context("Cancel blocking topsites", function () {
    beforeEach(function () {
      contentWindow.osAPI.openLink("http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html");
      contentWindow.osAPI.openLink('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      contentWindow.jsAPI.search();
      $('.blockTopsite')[0].click();
      $('.blockTopsite')[0].click();
      $('#cancelEditTopsites')[0].click();
      contentWindow.jsAPI.search();
    });

    it("should not deleted the blocked topsite again", function () {
      const topsites = $('.topSitesLink');
      expect(topsites).to.have.length(2);
      expect(topsites[0].getAttribute('url')).to.equal('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      expect(topsites[1].getAttribute('url')).to.equal('http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html');
    });
  });

  context("restore blocked topsites", function () {
    beforeEach(function () {
      contentWindow.osAPI.openLink("http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html");
      contentWindow.osAPI.openLink('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      contentWindow.jsAPI.search();
      $('.blockTopsite')[1].click();
      $('#doneEditTopsites')[0].click();
      contentWindow.jsAPI.restoreBlockedTopSites();
      contentWindow.jsAPI.search();
    });

    it("should display the restored topsites", function () {
      const topsites = $('.topSitesLink');
      expect(topsites).to.have.length(2);
      expect(topsites[0].getAttribute('url')).to.equal('http://www.manager-magazin.de/unternehmen/artikel/bayer-uebernahmepoker-mit-monsanto-geht-weiter-a-1094026.html');
      expect(topsites[1].getAttribute('url')).to.equal('http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html');
    });
  });

  context("Deduplicate sites with common domain", function () {
    beforeEach(function () {
      contentWindow.osAPI.openLink("http://www.tagesschau.de/eilmeldung/eilmeldung-1203.html");
      contentWindow.osAPI.openLink("http://www.tagesschau.com/eilmeldung/eilmeldung-1204.html");
      contentWindow.osAPI.openLink("http://m.tagesschau.de/eilmeldung/eilmeldung-1205.html");
      contentWindow.jsAPI.search();
    });

    it("should display one topsite", function () {
      const topsites = $('.topSitesLink');
      expect(topsites).to.have.length(1);
    });
  });
});
