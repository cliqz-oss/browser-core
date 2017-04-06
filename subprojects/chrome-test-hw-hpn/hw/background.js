var manifest = chrome.runtime.getManifest();
var contentScriptPath = "content.js";
var hpnWorkerPath = "hpn-worker.js";
if(manifest.version_name === "packaged"){
  contentScriptPath = "js/hw/content.js";
  hpnWorkerPath = "js/hw/hpn-worker.js";
}

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
    CliqzHumanWeb.httpCache[requestDetails.url] = {'status': requestDetails.statusCode, 'time': CliqzHumanWeb.counter}
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

chrome.webRequest.onBeforeSendHeaders.addListener(observeRequest, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["requestHeaders"]);
chrome.webRequest.onBeforeRedirect.addListener(observeRedirect, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["responseHeaders"]);
chrome.webRequest.onResponseStarted.addListener(observeResponse, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["responseHeaders"]);
// chrome.webRequest.onAuthRequired.addListener(observeAuth, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["responseHeaders"]);
chrome.webRequest.onCompleted.addListener(domain2IP, {urls:["http://*/*", "https://*/*"],tabId:-1},["responseHeaders"])


var eventList = ['onDOMContentLoaded'];


var CliqzChromeDB = __CliqzChromeDB().execute();
var CliqzHumanWeb = __CliqzHumanWeb().execute();
var CliqzBloomFilter = __CliqzBloomFilter().execute();
var CliqzUtils = __CliqzUtils().execute();


// Needed for onLocation Change arguments.
var aProgress = {};
var aRequest = {};
var aURI = {};

CliqzHumanWeb.init();
CliqzSecureMessage.init();


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


// chrome.history.onVisitRemoved.addListener(CliqzHumanWeb.onHistoryVisitRemoved);
// chrome.browsingData.removeHistory({}, e => {console.log(e)});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete' && tab.status == 'complete' && tab.url != undefined) {
        if (tab.url.startsWith('https://') || tab.url.startsWith('http://')) {
            chrome.tabs.executeScript(tabId, {file: contentScriptPath});
        }
    }
});


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
