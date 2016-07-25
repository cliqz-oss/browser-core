'use strict';
/*
 * This module injects warning message when user visit a phishing site
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHumanWeb',
  'chrome://cliqzmodules/content/CliqzHumanWeb.jsm');

var EXPORTED_SYMBOLS = ['CliqzAntiPhishing'];
var BW_URL = "http://antiphishing.clyqz.com/api/bwlist?md5=";

var domSerializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
        .createInstance(Components.interfaces.nsIDOMSerializer);

function alert(doc, md5, tp) {
    if (md5 in CliqzAntiPhishing.forceWhiteList)
        return;
    var fe = doc.querySelector("body>*");
    var el = doc.createElement("DIV");
    var els = doc.createElement("SCRIPT");
    el.setAttribute("style", "width: 100% !important; height: 100%; position: fixed; opacity: 0.95; background: grey;top: 0; left: 0; z-index: 999999999999999999999;");
    el.onclick = function(e) {
        e.stopPropagation();
    };
    var d = doc.createElement('div');
    d.align = 'center';
    var bt = doc.createElement('input');
    bt.type = 'button';
    bt.value = "I don't care, take me to it";
    el.innerHTML = "<div align=\"center\"><h1>This is a phishing site</h1></div>";
    d.appendChild(bt);
    var bt2 = doc.createElement('input');
    bt2.type = 'button';
    bt2.value = "This is not a phishing site, report to CLIQZ";
    d.appendChild(bt2);
    el.appendChild(d);
    bt.onclick = function() {
        doc.body.removeChild(el);
        CliqzHumanWeb.notification({'url': doc.URL, 'action': 'ignore'});
    };
    bt2.onclick = function() {
        doc.body.removeChild(el);
        CliqzAntiPhishing.forceWhiteList[md5] = 1;
        CliqzHumanWeb.notification({'url': doc.URL, 'action': 'report'});
    };
    els.innerHTML = "window.onbeforeunload = function () {}";
    doc.body.insertBefore(el, fe);
    doc.body.appendChild(els);
}

function checkPassword(doc, callback) {
    var inputs = doc.querySelectorAll('input');
    for (var i=0; i<inputs.length; i++) {
        if (inputs[i].type == 'password' ||
            inputs[i].value == 'password' && inputs[i].name == 'password' ||
            inputs[i].value == 'passwort' && inputs[i].name == 'passwort') {
            callback(doc.URL, 'password');
            return;
        }
    }

    var html = domSerializer.serializeToString(doc);
    if (html.indexOf('security') > -1 &&
        html.indexOf('update') > -1 &&
        html.indexOf('account') > -1) {
        callback(doc.URL, 'password');
        return;
    }
}

function checkSingleScript(script) {
    // if someone try to get the current date
    if (script.indexOf('getTime') > -1 &&
        script.indexOf('getDay') > -1 &&
        script.indexOf('getDate') > -1)
        return true;

    // if someone try to block exiting
    if (script.indexOf('onbeforeunload') > -1)
        return true;

    if (script.indexOf('downloadEXEWithName') > -1)
        return true;
    return false;
}

function checkCheat(doc, callback){
    var html = domSerializer.serializeToString(doc);
    if (html.indexOf('progress-bar-warning') > -1 && html.indexOf('progress-bar-success') > -1 ||
        html.indexOf('play-progress') > -1 && html.indexOf('buffer-progress') > -1)
        callback(doc.URL, 'cheat');
}

function checkScript(doc, callback) {
    var scripts = doc.querySelectorAll('script');
    var domain = doc.URL.replace('http://', '').replace('https://', '').split("/")[0];
    for (var i=0; i<scripts.length; i++) {
        var script = '';
        if (scripts[i].src) {
            // if the script is from the same domain, fetch it
            var dm = scripts[i].src.replace('http://', '').replace('https://', '').split("/")[0];
            if (dm == domain) {
                var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
                req.open('GET', scripts[i].src, false);
                req.send('null');
                script = req.responseText;
            }
        } else
            script = scripts[i].innerHTML;
        if (checkSingleScript(script))
            callback(doc.URL, 'script');
    }
}

function getDomainMd5(url) {
    var domain = url.replace('http://', '').replace('https://', '').split("/")[0];
    return CliqzHumanWeb._md5(domain);
}

function getSplitDomainMd5(url) {
    var md5 = getDomainMd5(url);
    var md5Prefix = md5.substring(0, md5.length-16);
    var md5Surfix = md5.substring(16, md5.length);
    return [md5Prefix, md5Surfix];
}

function notifyHumanWeb(p) {
    var url = p.url;
    var status = p.status;
    CliqzHumanWeb.state['v'][url]['isMU'] = status;
    CliqzHumanWeb.addURLtoDB(url, CliqzHumanWeb.state['v'][url]['ref'], CliqzHumanWeb.state['v'][url]);
    CliqzUtils.log("URL is malicious: "  + url + " : " + status, 'antiphishing');
}

function updateSuspiciousStatus(url, status) {
    var [md5Prefix, md5Surfix] = getSplitDomainMd5(url);
    CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix] = 'suspicious:' + status;
    if (CliqzHumanWeb) {
        var p = {'url': url, 'status': status};
        if (CliqzHumanWeb.state['v'][url]) {
            notifyHumanWeb(p);
        } else {
            CliqzUtils.log("delay notification", "antiphishing");
            CliqzUtils.setTimeout(notifyHumanWeb, 1000, p);
        }
    }
}

function updateBlackWhiteStatus(req, md5Prefix) {
    var response = req.response;
    var blacklist = JSON.parse(response).blacklist;
    var whitelist = JSON.parse(response).whitelist;
    if (!(md5Prefix in CliqzAntiPhishing.blackWhiteList))
        CliqzAntiPhishing.blackWhiteList[md5Prefix] = {};
    for (var i = 0; i < blacklist.length; i++) {
        CliqzAntiPhishing.blackWhiteList[md5Prefix][blacklist[i][0]] = 'black:' + blacklist[i][1];
    }
    for (var i = 0; i < whitelist.length; i++) {
        CliqzAntiPhishing.blackWhiteList[md5Prefix][whitelist[i]] = 'white';
    }
}

function checkSuspicious(doc, callback) {
    CliqzUtils.log('check ' + doc.URL, 'antiphishing');
    checkScript(doc, callback);
    checkCheat(doc, callback);
    checkPassword(doc, callback);
}

function checkStatus(url, md5Prefix, md5Surfix) {
    var doc = CliqzHumanWeb.getCDByURL(url);
    var bw = CliqzAntiPhishing.blackWhiteList[md5Prefix];
    if (md5Surfix in bw) {  // black, white, suspicious or checking
        if (bw[md5Surfix].indexOf('black') > -1) {  // black
            CliqzHumanWeb.notification({'url': url, 'action': 'block'});
            // alert(doc, md5Prefix + md5Surfix, bw[md5Surfix]);
        }
    } else {
        CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix] = 'checking';
        // alert humanweb if it is suspicious
        checkSuspicious(doc, updateSuspiciousStatus);
    }
}

var CliqzAntiPhishing = {
    forceWhiteList: {},
    blackWhiteList: {},
    auxOnPageLoad: function(url) {
        var [md5Prefix, md5Surfix] = getSplitDomainMd5(url);
        if (md5Prefix in CliqzAntiPhishing.blackWhiteList)
            checkStatus(url, md5Prefix, md5Surfix);
        else
            CliqzUtils.httpGet(
                BW_URL + md5Prefix,
                function success(req) {
                    updateBlackWhiteStatus(req, md5Prefix);
                    checkStatus(url, md5Prefix, md5Surfix);
                },
                function onerror() {
                },
                3000
            );
    },
    getDomainStatus: function(url) {
        var [md5Prefix, md5Surfix] = getSplitDomainMd5(url);
        if (!(md5Prefix in CliqzAntiPhishing.blackWhiteList) ||
            !(md5Surfix in CliqzAntiPhishing.blackWhiteList[md5Prefix]))
            return [null, null];
        var status = CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix];
        if (status == 'white')
            return [status, null];
        else {
            var statusItems = status.split(':');
            if (statusItems.length == 2)
                return statusItems;
            else
                return [null, null];
        }
    }
};
