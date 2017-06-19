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
    win.fakeServer = win.sinon.fakeServer.create({
      autoRespond: true,
      respondImmediately: true
    });
    window.sinon = win.sinon;
    fakeServer = win.fakeServer;

    win.sinon.FakeXMLHttpRequest.useFilters = true;

    win.sinon.FakeXMLHttpRequest.addFilter(function (method, url) {
      return url.indexOf('api/v2') === -1;
    });
    win.sinonLoaded = true;

    resolver();
  };
  win.document.body.appendChild(sinonScript);

  return promise;
}
