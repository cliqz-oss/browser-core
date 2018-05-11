var __CliqzChromeDB = function() { // (_export) {
    "use strict";

    return {
        setters: [],
        execute: function () {
            CliqzChromeDB = {
                VERSION: '0.1',
                set: function(db, key, obj, callback) {
                    var dbKey = db+':'+key;
                    var o = {};
                    o[dbKey] = obj;
                    chrome.storage.local.set(o, callback);
                },
                get: function(db, keyValueOrFunction, callback) {

                    if (typeof keyValueOrFunction === 'function') {

                        chrome.storage.local.get(null, function(items) {
                            var results = [];
                            Object.keys(items).forEach( function(lab) {
                                if (lab.startsWith(db)) {
                                    if (keyValueOrFunction(items[lab])) results.push(items[lab]);
                                }
                            });
                            callback(results);
                        });

                    }
                    else {
                        var dbKey = db+':'+keyValueOrFunction;
                        chrome.storage.local.get(dbKey, function(items) {
                            callback(items[dbKey]);
                        });
                    }
                },
                remove: function(db, keyValueOrFunction, callback) {

                    if (typeof keyValueOrFunction === 'function') {

                        chrome.storage.local.get(null, function(items) {
                            var resultsToBeRemoved = [];
                            Object.keys(items).forEach( function(lab) {
                                if (lab.startsWith(db)) {
                                    if (keyValueOrFunction(items[lab])) {
                                        var dbKey = db+':'+lab;
                                        resultsToBeRemoved.push(dbKey);
                                    }
                                }
                            });

                            chrome.storage.local.remove(resultsToBeRemoved, callback)
                        });

                    }
                    else {
                        var dbKey = db+':'+keyValueOrFunction;
                        chrome.storage.local.remove(dbKey, callback);
                    }
                },
                size: function(callback) {
                    if (typeof(chrome.storage.local.getBytesInUse) != 'undefined' &&
                        typeof(chrome.storage.local.QUOTA_BYTES) != 'undefined'
                        ) {
                            chrome.storage.local.getBytesInUse(null, function(a) {
                                var res = [a, a/chrome.storage.local.QUOTA_BYTES];
                                if (callback) callback(res);

                            });
                        }
                    else {
                        const QUOTA_BYTES = 5000000;
                        chrome.storage.local.get(null, data => {
                            let size = 0;
                            Object.keys(data).forEach(key => {
                                size += (key + JSON.stringify(data[key])).length;
                            });
                            let res = [size, size / QUOTA_BYTES];
                            if (callback) callback(res);
                        });
                    }
                },
                removeEverything: function() {
                    // Looks like the DB size breached the threshold, we should remove only human-web / hpn
                    // specific information. running .clear() would clear everything even ghostery settings.
                    let toBeRemoved = [];
                    chrome.storage.local.get(null, items => {
                        Object.keys(items).forEach( value => {
                            let keyPrefix = value.split(':')[0];
                            if (dbPrefixes.indexOf(keyPrefix) > -1) {
                                toBeRemoved.push(value);
                            }
                        });

                        if (toBeRemoved.length > 0) {
                            CliqzUtils.log("Keys to be removed " + JSON.stringify(toBeRemoved));
                            chrome.storage.local.remove(toBeRemoved);
                        }
                    });
                },
                init: function() {
                    CliqzChromeDB.size(function(sv) {
                        if (sv && sv[1] > 0.90) {
                            // more than 90% utilization,
                            // drop everything

                            CliqzChromeDB.removeEverything();

                            // we should send a telemetry signal for when it
                            // happens
                            var payload = {};
                            payload['cleared'] = true;
                            CliqzHumanWeb.telemetry({ 'type': 'humanweb', 'action': 'dbcleared', 'payload': payload });
                        }
                    })
                },
                __test_sets: function() {

                    var tt = new Date().getTime();

                    var objs = [];
                    for(var i=0;i<10000;i++) {
                        objs.push({'nestedPayload': {'f1': md5(''+Math.random()), 'f2': md5(''+Math.random())}, 'payload': md5(''+Math.random()), 'url': 'url'+i, 'count': i});
                    }

                    console.log('preparing ' +  (new Date().getTime() - tt)/1000 + "s");

                    tt = new Date().getTime();

                    var cont = 0;
                    for(var i=0;i<objs.length;i++) {

                        CliqzChromeDB.set('testdb', objs[i].url, objs[i], function() {
                            cont ++;
                            if (cont==objs.length) {
                                // done all
                                console.log("Elapsed time for " + objs.length + " " + (new Date().getTime() - tt)/1000 + "s");
                            }
                        });
                    }
                },
                __test_get: function() {

                    var tt = new Date().getTime();
                    CliqzChromeDB.get('testdb', 'url10', function(obj) {
                        console.log(obj);
                        console.log("Elapsed time for simple get " + JSON.stringify(obj) + " " + (new Date().getTime() - tt) + "ms");
                    });

                    CliqzChromeDB.get('testdb', function(o) {
                        return o.url == 'url10';
                    }, function(obj) {
                        console.log(obj);
                        console.log("Elapsed time for get with function " + JSON.stringify(obj) + " " + (new Date().getTime() - tt) + "ms");
                    });

                    CliqzChromeDB.get('testdb', function(o) {
                        return (o.count % 100)==0;
                    }, function(obj) {
                        console.log(obj);
                        console.log("Elapsed time for get with range function " + JSON.stringify(obj) + " " + (new Date().getTime() - tt) + "ms");
                    });

                }


            }

            var _c = CliqzChromeDB;
            _c.init();

            return _c;
        }
    }
};