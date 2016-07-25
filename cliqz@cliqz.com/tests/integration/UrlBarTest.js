TESTS.UrlBarTest = function (CliqzUtils) {

  describe('UrlBar integration', function(){

    afterEach(function () {
      fillIn("");
    });

    context("api driven result", function () {
      var result = {
        "result": [
          {
            "q": "xx-face",
            "url": "https://www.facebook.com/",
            "score": 0,
            "confidence": null,
            "source": "bm",
            "snippet": {
              "alternatives": [],
              "desc": "Facebook is a social utility that connects people with friends and others who work, study and live around them.",
              "language": {
                "en": 1
              },
              "og": {
                "image": "https://www.facebook.com/images/fb_icon_325x325.png"
              },
              "title": "Facebook"
            }
          }
        ]
      }, query = result.result[0].q;

      beforeEach(function() {
        respondWith(result);
        fillIn(query);
      });

      it('popup opens', function() {
        return waitForPopup();
      });

      it('should return results from bigmachine', function () {
        return waitForPopup().then(function () {
          var $title = $cliqzResults().find(".cqz-result-box .cqz-result-title")[0].textContent.trim();
          chai.expect($title).to.contain("Facebook");
        });
      });

      it('should open new tab when clicking on a result', function () {
        return waitForPopup().then(function () {
          click($cliqzResults().find(".cqz-result-box .cqz-result-title")[0]);
          chai.expect(CliqzUtils.getWindow().gBrowser.tabs).to.have.length(2);
        });
      });

    });

    context("history results", function () {
      beforeEach(function () {
        respondWith({
          result: []
        });
        fillIn("mozilla");
        return waitForPopup();
      });

      it('should trigger firefox history search', function () {
        var $pattern = $cliqzResults().find(".cqz-result-box .cliqz-pattern-element");
        chai.expect($pattern.attr("url")).to.contain("mozilla");
        chai.expect($pattern).to.have.length.above(0);
      });

    });
  });
};
