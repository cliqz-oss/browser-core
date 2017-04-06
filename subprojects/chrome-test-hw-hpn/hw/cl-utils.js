var __CliqzUtils = function() { // (_export) {
    "use strict";

    return {
        setters: [],
        execute: function () {
            CliqzUtils = {
                VERSION: '0.1',
                prefs : {},
                log: function(msg, key) {
                    console.log(msg, key);
                },
                getPref: function(label, defaultValue) {
                    //  CliqzUtils.getPref('config_ts', null);
                    //  CliqzUtils.getPref('config_location', null);
                    //  CliqzUtils.getPref('config_activeUsage', null);
                    switch (label)
                    {
                        case "config_ts":
                            defaultValue = CliqzHumanWeb.getTime().slice(0, 8);
                            if(CliqzUtils.prefs.hasOwnProperty(label)){
                                defaultValue = CliqzUtils.prefs[label];
                            }
                            break;
                        case "config_location":
                            defaultValue = "de";
                            if(CliqzUtils.prefs.hasOwnProperty(label)){
                                defaultValue = CliqzUtils.prefs[label];
                            }
                        default:
                            defaultValue;
                            break;
                    }
                    return defaultValue;
                },
                setPref: function(label, value) {
                    console.log("Need to set pref" + label + " : " + value);
                    CliqzUtils.prefs[label] = value;
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

            }

            return CliqzUtils;
        }
    }
};