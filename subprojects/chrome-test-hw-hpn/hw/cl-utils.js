var __CliqzUtils = function() { // (_export) {
    "use strict";

    return {
        setters: [],
        execute: function () {
            CliqzUtils = {
                VERSION: '0.1',
                prefs : {},
                CONFIG_PROVIDER: '{{CONFIG_PROVIDER}}',
                log: function(msg, key) {
                    console.log(msg, key);
                },
                getPref: function(label, defaultValue) {
                    if (CliqzUtils.prefs.hasOwnProperty(label)) {
                        return CliqzUtils.prefs[label];
                    } else {
                        return defaultValue;
                    }
                },
                loadPrefs: function(){
                    return new Promise(function(resolve, reject) {
                        let _prefs = prefs.map( e => {return 'prefs:' + e});
                        chrome.storage.local.get(_prefs, results => {
                            Object.keys(results).forEach( e => {
                                if (typeof(results[e]) != 'undefined') {
                                    let prefName = e.split(':')[1];
                                    CliqzUtils.prefs[prefName] = results[e];
                                }
                            });
                            resolve();
                        });
                    });
                },
                setPref: function(label, value) {
                    CliqzUtils.log("Need to set pref" + label + " : " + value);
                    if (prefs.indexOf(label) > -1) {
                        CliqzUtils.prefs[label] = value;
                        CliqzChromeDB.set('prefs', label, value, result => {
                            CliqzUtils.log("Pref set: " + label);
                        });
                    } else {
                        CliqzUtils.log("Pref is not set in the list of prefs. Did not store." + label + " : " + value);
                    }
                },
                setTimeout: function(callback, time, args) {
                },
                clearTimeout: function(id) {

                },
                setInterval: function(callback, time) {

                },
                httpHandler: function(method, url, callback, onerror, timeout, data){
                    var req = new XMLHttpRequest();
                    req.open(method, url, true);
                    req.overrideMimeType('application/json');
                    req.onload = function(){
                      if(req.status != 200 && req.status != 0 /* local files */){
                        CliqzUtils.log( "loaded with non-200 " + url + " (status=" + req.status + " " + req.statusText + ")", "CliqzUtils.httpHandler");
                        onerror && onerror();
                      } else {
                        callback && callback(req);
                      }
                    }
                    req.onerror = function(){
                      if(CliqzUtils){
                        CliqzUtils.log( "error loading " + url + " (status=" + req.status + " " + req.statusText + ")", "CliqzUtils.httpHandler");
                        onerror && onerror();
                      }
                    }
                    req.ontimeout = function() {
                      if(CliqzUtils){ //might happen after disabling the extension
                        CliqzUtils.log( "timeout for " + url, "CliqzUtils.httpHandler");
                        onerror && onerror();
                      }
                    }

                    if(callback){
                      if(timeout){
                        req.timeout = parseInt(timeout)
                      } else {
                        req.timeout = (method == 'POST'? 10000 : 1000);
                      }
                    }
                    req.send(data);
                    return req;
                },
                httpGet: function(url, callback, onerror, timeout){
                    return CliqzUtils.httpHandler('GET', url, callback, onerror, timeout);
                },
                httpPost: function(url, callback, data, onerror, timeout) {
                    return CliqzUtils.httpHandler('POST', url, callback, onerror, timeout, data);
                },
                cloneObject: function(obj) {
                    if (obj === null || typeof obj !== 'object') return obj;
                    var temp = obj.constructor();
                    for (var key in obj) {
                        temp[key] = CliqzUtils.cloneObject(obj[key]);
                    }
                    return temp;
                },
                fetchAndStoreConfig: function() {
                    //Load latest config.
                    CliqzUtils.httpGet(CliqzUtils.CONFIG_PROVIDER, function success(req) {
                        if (!CliqzHumanWeb) return;
                        try {
                            let config = JSON.parse(req.response);
                            if (config && config['location']) {
                                CliqzUtils.setPref('config_location', config['location'])
                            }
                        } catch (e) {};
                    }, function error(res) {
                        _log('Error loading config. ');
                    }, 5000);
                },
                getWindow: function() {
                    return "";
                }
            }

            return CliqzUtils;
        }
    }
};