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
    window.sinon = contentWindow.sinon;
    window.fakeServer = sinon.fakeServer.create({
      autoRespond: true,
      respondImmediately: true
    });

    contentWindow.sinon.FakeXMLHttpRequest.addFilter(function (method, url) { return url.indexOf('api/v2') === -1 });
    contentWindow.sinon.FakeXMLHttpRequest.useFilters = true;
    contentWindow.sinonLoaded = true;
    resolver();
  };
  win.document.body.appendChild(sinonScript);

  return promise;
}
