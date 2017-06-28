DEPS.UrlBarTest = ["core/utils"];
TESTS.UrlBarTest = function (CliqzUtils) {

  describe('UrlBar integration', function () {
    this.retries(1);

    afterEach(function () {
        fillIn("");
    });

    context("api driven result", function () {
      var result = {
        "q": "facebook",
        "results": [
          {
            "snippet": {
              "title": "Facebook",
              "extra": {
                "og": {
                  "image": "https://www.facebook.com/images/fb_icon_325x325.png"
                },
                "alternatives": [

                ],
                "m_url": "https://m.facebook.com/",
                "language": {
                  "de": 1
                }
              },
              "description": "Facebook ist ein soziales Netzwerk, das Menschen mit ihren Freunden, Arbeitskollegen, Kommilitonen und anderen Mitmenschen verbindet."
            },
            "url": "https://de-de.facebook.com/",
            "type": "bm"
          }
        ],
        "schema_valid": true
      }, query = result.q;

      beforeEach(function () {
        respondWith(result);
        fillIn(query);
      });

      it('popup opens', function () {
        return waitForPopup();
      });

      it('should return results from bigmachine', function () {
        return waitForPopup().then(function () {
            var $title = $cliqzResults().find(".result [data-extra='title']")[0].textContent.trim();
            chai.expect($title).to.contain("Facebook");
        });
      });

      xit('should open new tab when clicking on a result', function () {
        return waitForPopup().then(function () {
          click($cliqzResults().find(".result [data-extra='title']")[0]);
          chai.expect(CliqzUtils.getWindow().gBrowser.tabs).to.have.length(2);
        });
      });

    });

    context("custom results - #team", function () {
      beforeEach(function () {
        respondWith({
          results: []
        });
        fillIn("#team");
      });

      it('should trigger firefox history search', function () {
        waitForPopup().then(function() {
          var $pattern = $cliqzResults().find(".result");
          chai.expect($pattern.attr("url")).to.equal("https://cliqz.com/team/");
          chai.expect($pattern).to.have.length.above(0);
        });
      });
    });

    context("custom results - maps", function () {
      beforeEach(function () {
        respondWith({
          results: []
        });
        fillIn("#gm wisen");
      });

      it('should trigger firefox history search', function () {
        waitForPopup().then(function() {
          var $pattern = $cliqzResults().find(".result");
          chai.expect($pattern.attr("url")).to.contain("maps.google.de/maps?q=wisen");
          chai.expect($pattern).to.have.length.above(0);
        });
      });
    });
  });
};
