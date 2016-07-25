Components.utils.import('chrome://cliqztests/content/screenshots/Screenshot.jsm');
var QUERIES = [];

TESTS.SmartCliqzTest = function (CliqzUtils) {

  function readQueries() {
    return new Promise(function (resolve, reject) {
      CliqzUtils.loadResource('chrome://cliqztests/content/screenshots/queries.json', function (req) {
        var json = JSON.parse(req.response),
            queries = [];
        for(var i = 0; i < json.queries.length; i++) {
          queries.push(json.queries[i].q);
        }
        resolve(queries);
      });
    });
  }

  function padNumber(i, n) {
    var t = i;
    while (t >= 10) {
      n--;
      t /= 10;
    }
    var out = '';
    while (n > 0) {
      n--;
      out += '0';
    }
    return out + i;
  }

  function escapeQuery(query) {
    return query.replace(/ /g, '_').
                 replace(/:/g, '_');
  }

  describe('SmartCliqz', function(){
    this.timeout(5000);

    before(function () {
      // Give browser some time to startup properly
      return new Promise(function (resolve) {
        setTimeout(resolve, 1000);
      });
    });

    after(function () {
      // Give browser some time save last image
      return new Promise(function (resolve) {
        setTimeout(resolve, 2000);
      });
    });

    beforeEach(function() {
      CliqzUtils.getWindow().document.getElementById('mainPopupSet').style.position = 'relative';
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.display = 'block';
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.position = 'absolute';
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.marginTop = '72px';
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.marginLeft = '32px';
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.boxShadow = '1px 1px 10px #ccc';
    });

    //TODO get queries from queries.json
    var queries = {
      'top':
          ['google.de', 'g', 'f', 'y', 'goo', 'fa', 'www.google.de', 'face',
           'go', 'web.de', 'you', 'gmx.de', 'ebay.de', 'google', 'bild.de', 'fac',
           'ama', 'amazon.de', 'ebay', 'we'],
      'smartcliqz':
          ['flug LH76', '500 EUR in USD', '5m in inch',
           'aktuelle uhrzeit los angeles', 'aktie apple',
           'wetter in muenchen',
           'spiegel.de', 'amazon.de', 'dkb.de'],
      'thuy':
          ['wetter m', 'wetter ber', 'bier',
           'http://www.imdb.com/title/tt0499549', 'imdb ava']
    }

    var i = 0;
    for (k in queries) {
      queries[k].forEach(function (query) {
        it('should take screenshot of query: '+ query, function() {
          fillIn(query);

          return waitForResult().then(function() {
            return new Promise(function (resolve) {
              setTimeout(resolve, 2000);
              i++;
            });
          }).then(function () {
            return Screenshot.exec({
              filename: 'dropdown-' + padNumber(i, 2) + '-' + escapeQuery(query)
            });
          });
        });
      });
    }
  });
};