importScripts("chrome://cliqz/content/hm/webworker-polyfill.js");

System.import('hm/convert-index').then(function(x) {
    var buildIndex = x.default;
    var placesLabels = ['id', 'url', 'title', 'rev_host', 'visit_count', 'hidden', 'typed', 'favicon_id', 'frecency', 'last_visit_date', 'guid', 'foreign_count'];
    var inputhistoryLabels = ['place_id', 'input', 'use_count'];
    var historyvisitsLabels = ['id','from_visit','place_id','visit_date','visit_type','session'];

    function uncompressRow(row, labels) {
        var n = row.length;
        var obj = {};
        for (var i = 0; i < n; ++i) {
            obj[labels[i]] = row[i];
        }
        return obj;
    }

    // e is an array of 3-arrays objects (formerly 6, but cliqz.db is not longer there)
    // each elem in a 3-array object is a row, represented as array
    self.onmessage = function(e) {
        e = e.data;
        var n = e.length;
        // Uncompress rows: arrays -> objects
        for (var i = 0; i < n; ++i) {
            var m = e[i][0].length;
            for (var j = 0; j < m; ++j) {
                e[i][0][j] = uncompressRow(e[i][0][j], placesLabels);
            }
            m = e[i][1].length;
            for (var j = 0; j < m; ++j) {
                e[i][1][j] = uncompressRow(e[i][1][j], inputhistoryLabels);
            }
            m = e[i][2].length;
            for (var j = 0; j < m; ++j) {
                e[i][2][j] = uncompressRow(e[i][2][j], historyvisitsLabels);
            }
        }
        self.postMessage(buildIndex(e));
    };
})
.catch(function(x) {
    console.log('ERROR importing worker:', x);
});

