var expect = chai.expect;

var contentWindow, fakeServer;

function cliqzResponse(query, results) {
  var results = JSON.stringify({
    q: query,
    results: results,
    schema_valid: true
  });

  fakeServer.respondWith(
    "GET",
    new RegExp(".*api\/v2\/results.*"),
    [ 200, { "Content-Type": "application/json" }, results ]
  );
}


function newsResponse(articles) {
  var response = JSON.stringify({
    "q": "",
    "results": [
      {
        "url": "rotated-top-news.cliqz.com",
        "trigger_method": "url",
        "snippet": {
          "friendlyUrl": "rotated-top-news.cliqz.com",
          "extra": {
            "news_version": 1473768540,
            "articles": [
              {
                "domain": "tagesschau.de",
                "breaking": false,
                "description": "Sollte Ungarn wegen seines Umgangs mit Fl\\u00fcchtlingen aus der EU ausgeschlossen werden? Ja, findet Luxemburgs Au\\u00dfenminister Asselborn. Nein, meint Bundesau\\u00dfenminister Steinmeier. In wenigen Tagen treffen sich 27 EU-Staats- und Regierungschefs in Bratislava.",
                "title": "Steinmeier ist gegen EU-Ausschluss Ungarns",
                "url": "https://www.tagesschau.de/ausland/asselborn-ungarn-103.html",
                "media": "https://www.tagesschau.de/multimedia/bilder/steinmeier-259~_v-videowebm.jpg",
                "amp_url": "http://www.tagesschau.de/ausland/asselborn-ungarn-103~amp.html",
                "mobile_url": "",
                "short_title": "Steinmeier ist gegen EU-Ausschluss Ungarns"
              }
            ],
            "template": "hb-news",
            "last_update": 1473771022
          }
        },
        "subType": {
          "class": "FreshTabNewsCache",
          "id": "5796769761289695642",
          "name": "Rotated Top News"
        },
        "trigger": [

        ],
        "type": "rh"
      }
    ],
    "schema_valid": true
  });

  fakeServer.respondWith(
    "PUT",
    new RegExp(".*api\/v2\/rich-header.*"),
    [ 200, { "Content-Type": "application/json" }, response ]
  );
}


function $(selector) {
  return contentWindow.document.querySelectorAll(selector)
}

function injectSinon(win) {
  var resolver,
      promise = new Promise(function (resolve) {
        resolver = resolve;
      });

  var sinonScript = win.document.createElement("script");
  sinonScript.src = "/bower_components/sinonjs/sinon.js";
  sinonScript.onload = function () {
    window.sinon = contentWindow.sinon;
    resolver();
  };
  win.document.body.appendChild(sinonScript);

  return promise;
}
