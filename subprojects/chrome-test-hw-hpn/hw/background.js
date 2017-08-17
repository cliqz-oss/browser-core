var manifest = chrome.runtime.getManifest();

// For packaging with Ghostery
var contentScriptPath = "modules/human-web/content.js";

// For packaging with chromium + cliqz.
if(manifest.version_name === "packaged"){
  contentScriptPath = "js/hw/content.js";
}

// For packaging as a standalone web extension.
if(manifest.name === "CLIQZ search" || manifest.version_name === "standalone"){
  contentScriptPath = "human-web/content.js";
}

const channel = manifest.name.toLowerCase();

const allowedCountryCodes = ['de', 'at', 'ch', 'es', 'us', 'fr', 'nl', 'gb', 'it', 'se'];

const dbPrefixes = ['usafe', 'telemetry', 'hpn', 'prefs'];
const prefs = ['config_location','humanWeb','hpnTelemetry','config_ts', 'config_activeUsageCount', 'config_activeUsage', 'enable_human_web'];


function observeRequest(requestDetails){
    for (var i = 0; i < requestDetails.requestHeaders.length; ++i) {
      if (requestDetails.requestHeaders[i].name === 'Referer') {
           if (CliqzHumanWeb.gadurl.test(requestDetails.url)) {
                CliqzHumanWeb.linkCache[requestDetails.url] = {'s': ''+requestDetails.requestHeaders[i].value, 'time': CliqzHumanWeb.counter};
            }

           break;
      }
    }
    return {requestHeaders: requestDetails.requestHeaders}
}


function observeResponse(requestDetails){
    for (var i = 0; i < requestDetails.responseHeaders.length; ++i) {
      if (requestDetails.responseHeaders[i].name === 'WWW-Authenticate') {
        CliqzHumanWeb.httpCache401[requestDetails.url] = {'time': CliqzHumanWeb.counter};
      }
    }
    CliqzHumanWeb.httpCache[requestDetails.url] = {'status': requestDetails.statusCode, 'time': CliqzHumanWeb.counter};
    // domain2IP(requestDetails);
}

function observeRedirect(requestDetails){
    for (var i = 0; i < requestDetails.responseHeaders.length; ++i) {
      if (requestDetails.responseHeaders[i].name === 'Location') {
        CliqzHumanWeb.httpCache[requestDetails.url] = {'status': 301, 'time': CliqzHumanWeb.counter, 'location': requestDetails.responseHeaders[i].value};
      }
    }
}

/*
function observeAuth(requestDetails){
  // This does not capture the cases when password is already saved, but that should we taken care of when the doubeFetch happens.
  if(requestDetails.statusCode == 401){
    CliqzHumanWeb.httpCache401[requestDetails.url] = {'time': CliqzHumanWeb.counter};
  }
}
*/

function domain2IP(requestDetails) {
  if(requestDetails && requestDetails.ip) {
    let domain = CliqzHumanWeb.parseURL(requestDetails.url).hostname;
    CliqzHumanWeb.domain2IP[domain] = {ip: requestDetails.ip, ts: Date.now()};
  }
}


var eventList = ['onDOMContentLoaded'];


var CliqzChromeDB = __CliqzChromeDB().execute();
var CliqzHumanWeb = __CliqzHumanWeb().execute();
var CliqzBloomFilter = __CliqzBloomFilter().execute();
var CliqzUtils = __CliqzUtils().execute();


// Needed for onLocation Change arguments.
var aProgress = {};
var aRequest = {};
var aURI = {};

/*
TBR: Legacy.
function focusOrCreateTab(url) {
  chrome.windows.getAll({"populate":true}, function(windows) {
    var existing_tab = null;
    for (var i in windows) {
      var tabs = windows[i].tabs;
      for (var j in tabs) {
        var tab = tabs[j];
        if (tab.url == url) {
          existing_tab = tab;
          break;
        }
      }
    }
    if (existing_tab) {
      chrome.tabs.update(existing_tab.id, {"selected":true});
    } else {
      chrome.tabs.create({"url":url, "selected":true});
    }
  });
}
*/

// chrome.history.onVisitRemoved.addListener(CliqzHumanWeb.onHistoryVisitRemoved);
// chrome.browsingData.removeHistory({}, e => {console.log(e)});


/*
Replacing this in favour of chrome.runtime.onMessage.
chrome.runtime.onConnect.addListener(function(port) {
  var tab = port.sender.tab;
  // This will get called by the content script we execute in
  // the tab as a result of the user pressing the browser action.
  port.onMessage.addListener(function(info) {
    if(info.type == "dom"){
      CliqzHumanWeb.tempCurrentURL = tab.url;

      aProgress["isLoadingDocument"] = tab.status;
      aRequest["isChannelPrivate"] = tab.incognito;
      aURI["spec"] = tab.url;
      CliqzHumanWeb.contentDocument[decodeURIComponent(tab.url)] = {"doc":info.html,'time': CliqzHumanWeb.counter};
      CliqzHumanWeb.listener.onLocationChange(aProgress, aRequest, aURI);
    }
    else if(info.type == "event_listener"){
      var ev = {};
      ev["target"] = {"baseURI": info.baseURI,"href": null,"parentNode": {"href": null}};

      if(info.action == "keypress"){
        CliqzHumanWeb.captureKeyPressPage(ev);
      }
      else if(info.action == "mousemove"){
        CliqzHumanWeb.captureMouseMovePage(ev);
      }
      else if(info.action == "mousedown"){
        if(info.targetHref){
          ev["target"] = {"href": info.targetHref};
        }
        CliqzHumanWeb.captureMouseClickPage(ev);
      }
      else if(info.action == "scroll"){
        CliqzHumanWeb.captureScrollPage(ev);
      }
      else if(info.action == "copy"){
        CliqzHumanWeb.captureCopyPage(ev);
      }
    }
  });
})
*/
var background = {
  getAllOpenPages: function(){
    return new Promise(function(resolve, reject){
      var res = [];
      chrome.windows.getAll({populate:true},function(windows){
        windows.forEach(function(window){
          window.tabs.forEach(function(tab){
            res.push(tab.url);
          });
        });
        resolve(res);
      });
    });
  }
}

// This listener is used for accepting queries, and sending them through encrypted channel.
// We can add a check to make sure it only comes from our counterpart, by checking the senderID.
// For long-lived connections:

// This would need a bit of more testing before replacing.
// For now this is only needed for chromium based platforms
// therefore putting a check.

if (chrome.runtime && chrome.runtime.onConnect) {
  chrome.runtime.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(request) {
      if(!request.msg) return;
      var eID = request.eventID;
      var mc = new messageContext(request.msg);
      var proxyIP = getProxyIP();
      mc.aesEncrypt()
      .then(function(enxryptedQuery){
        return mc.signKey();
      })
      .then(function(){
        var data = {"mP":mc.getMP()}
        return _http(proxyIP)
             .post(JSON.stringify(data), "instant")
      })
      .then(function(response){
        if(request.msg.action != "extension-query") return;
        return mc.aesDecrypt(JSON.parse(response)["data"]);
      })
      .then(function(res){
        let resp = {"data":
            {
            "response": res
            },
            "eID": eID
          }
        port.postMessage(resp);
      })
    });
  });
}

function initOnMessage() {
    chrome.runtime.onMessage.addListener(onMessageListener);
}

function initWebRequestListeners() {
  // chrome.webRequest.onBeforeSendHeaders.addListener(observeRequest, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["requestHeaders"]);
  chrome.webRequest.onBeforeRedirect.addListener(observeRedirect, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["responseHeaders"]);
  chrome.webRequest.onResponseStarted.addListener(observeResponse, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["responseHeaders"]);
  chrome.webRequest.onCompleted.addListener(domain2IP, {urls:["http://*/*", "https://*/*"],tabId:-1});
}

function initTabListener() {
  chrome.tabs.onUpdated.addListener(tabListener);
}

function onMessageListener(info, sender, sendResponse) {
  // Listen for pref change from GH UI:
  if(info && info.name === 'onHWSettingChanged') {
     CliqzUtils.setPref('enable_human_web', info.message);

     // We should unload all the scripts, clear timers when the user sets it to false.
     // They only way to enable is via AB-test, hence only false conditions need to be tested.
     if (info.message === false) {
      unloadHumanWeb();
     }

     if (info.message === true) {
      initHumanWeb();
     }
  }

  // Will only get executed, if human-web in enabled and content script loaded.
  var tab = sender.tab;
  // This will get called by the content script we execute in
  // the tab as a result of the user pressing the browser action.
  if(info.type == "dom"){
    CliqzHumanWeb.tempCurrentURL = tab.url;

    CliqzHumanWeb.detectOwnKeyword(info.html, info.ad, info.hidden);

    aProgress["isLoadingDocument"] = tab.status;
    aRequest["isChannelPrivate"] = tab.incognito;
    aRequest["tabId"] = tab.id;

    aURI["spec"] = tab.url;
    CliqzHumanWeb.contentDocument[decodeURIComponent(tab.url)] = {"doc":info.html,'time': CliqzHumanWeb.counter};
    CliqzHumanWeb.listener.onLocationChange(aProgress, aRequest, aURI);
  }
  else if(info.type == "event_listener"){
    CliqzHumanWeb.tempCurrentURL = tab.url;
    var ev = {};
    ev["target"] = {"baseURI": info.baseURI,"href": null,"parentNode": {"href": null}};

    if(info.action == "keypress"){
      CliqzHumanWeb.captureKeyPressPage(ev);
    }
    else if(info.action == "mousemove"){
      CliqzHumanWeb.captureMouseMovePage(ev);
    }
    else if(info.action == "mousedown"){
      if(info.targetHref){
        ev["target"] = {"href": info.targetHref};
      }
      CliqzHumanWeb.captureMouseClickPage(ev);
    }
    else if(info.action == "scroll"){
      CliqzHumanWeb.captureScrollPage(ev);
    }
    else if(info.action == "copy"){
      CliqzHumanWeb.captureCopyPage(ev);
    }
  }
}
function tabListener(tabId, changeInfo, tab) {
  if (changeInfo.status == 'complete' && tab.status == 'complete' && tab.url != undefined) {
      if (tab.url.startsWith('https://') || tab.url.startsWith('http://')) {
          // We should execute the content script, with runAt, instead of setting timeout in content script.
          chrome.tabs.executeScript(tabId, {file: contentScriptPath, runAt: 'document_start'});
      }
  }
}
function initModules() {
  CliqzHumanWeb.init();
  CliqzSecureMessage.init();
}

function initHumanWeb() {

  initWebRequestListeners();
  initTabListener();
  initModules();

}


function enableHumanWeb() {
  if (navigator &&
      navigator.appVersion.indexOf('Edge') === -1 &&
      CliqzUtils.getPref('enable_human_web', false)
    ) {
    return true;
  } else {
    return false;
  }
}

function unloadHumanWeb() {
  CliqzHumanWeb.unload();
  CliqzSecureMessage.background.unload();
  chrome.tabs.onUpdated.removeListener(tabListener);
  chrome.runtime.onMessage.removeListener(onMessageListener);
  chrome.webRequest.onCompleted.removeListener(domain2IP);
  chrome.webRequest.onResponseStarted.removeListener(observeResponse);
  chrome.webRequest.onBeforeRedirect.removeListener(observeRedirect);
}

CliqzUtils.loadPrefs()
  .then( () => {
    // Need to have the pref change listener even when human-web is disabled.
    initOnMessage();
    if (enableHumanWeb()) {
      initHumanWeb();
    }
  })
  .catch( err => console.log("Error while loading prefs: " + err));
