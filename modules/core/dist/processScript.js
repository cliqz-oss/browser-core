/* globals Components, Extension */
/* globals sendAsyncMessage, removeMessageListener, addMessageListener */
/* globals addEventListener, content */
// CLIQZ pages communication channel
var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');
try {
  Components.utils.import("resource://gre/modules/Console.jsm");
} catch(e) {
  // Older version of Firefox
  Components.utils.import("resource://gre/modules/devtools/Console.jsm");
}

var config = {{CONFIG}};

var whitelist = [
  "chrome://cliqz/",
  "resource://cliqz/"
].concat(config.settings.frameScriptWhitelist);

/**
 * processScripts are supported for Firefox >= 38
 * so for older version we need to provide other means of communication
 */
if (typeof sendAsyncMessage !== "undefined") {
  function send(msg) {
    sendAsyncMessage("cliqz", msg);
  }

  function startListening(channel, cb) {
    addMessageListener(channel, cb);
  }

  function stopListening(channel, cb) {
    removeMessageListener(channel, cb);
  }
} else if(CliqzEvents) {
  function send(msg) {
    CliqzEvents.pub("process-script-cliqz", { data: msg });
  }

  function startListening(channel, cb) {
    CliqzEvents.sub("process-script-"+channel, cb);
  }

  function stopListening(channel, cb) {
    CliqzEvents.un_sub("process-script-"+channel, cb);
  }
}


function getContextHTML(ev) {
  var target = ev.target,
      count = 0,
      html;

  try {
    while(true) {
      html = target.innerHTML;

      if (html.indexOf('http://') !==-1 || html.indexOf('https://') !==-1 ) {

        return html;

      }

      target = target.parentNode;

      count+=1;
      if (count > 4) break;
    }
  } catch(ee) {
  }
}

Services.scriptloader.loadSubScript('chrome://cliqz/content/core/content-scripts.js');

var injectModules = ['adblocker', 'anti-phishing', 'green-ads', 'history'];
injectModules.forEach((moduleName) => {
  if (config.modules.indexOf(moduleName) > -1) {
    try {
      Services.scriptloader.loadSubScript('chrome://cliqz/content/'+moduleName+'/content-scripts.js');
    } catch(e) {
      // do nothing if missing
    }
  }
});


function onDOMWindowCreated(ev) {
  var window = ev.target.defaultView;

  window.chrome = {
    runtime: {
      sendMessage: function (message) {
        send({ payload: message });
      }
    }
  };

  // we only handle HTML documents for now
  if(window.document.documentElement.nodeName.toLowerCase() !== 'html'){
    return;
  }

  var currentURL = function(){return window.location.href};

  // Extract information about the window tree
  // originWindowID, parentWindowID, outerWindowID
  var windowTreeInformation;
  var windowId;
  if (config.modules.indexOf('green-ads') > -1) {
    windowTreeInformation = getWindowTreeInformation(window);
    windowId = windowTreeInformation.outerWindowID;
  } else {
    var windowId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c === "x" ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }

  var onMessage = function (ev) {
    var href = ev.target.location.href;

    if (!whitelist.some(function (url) { return href.indexOf(url) === 0; }) ) {
      return;
    }

    let message = {};

    try {
      message = JSON.parse(ev.data);
    } catch (e) {
      // non CLIQZ or invalid message should be ignored
    }

    if (message.target !== "cliqz") {
      return;
    }

    if (message.type === "response") {
      return;
    }

    send({
      origin: 'content',
      windowId: windowId,
      payload: message
    });
  };

  function onCallback(msg) {
    if (isDead()) {
      return;
    }

    if (config.modules.indexOf('adblocker') > -1) {
      responseAdbMsg(msg, window);
    }

    if (config.modules.indexOf('green-ads') > -1 && MODE !== 'disabled') {
      greenAdsOnMessageReceived({ msg, window });
    }

    if (config.modules.indexOf('anti-phishing') > -1) {
      responseAntiPhishingMsg(msg, window);
    }

    if (!whitelist.some(function (url) { return currentURL().indexOf(url) === 0; }) ) {
      return;
    }

    if (msg.data.origin === 'content') {
      window.postMessage(JSON.stringify({
        target: "cliqz",
        type: "response",
        response: msg.data.response,
        action: msg.data.action,
        module: msg.data.module,
        requestId: msg.data.requestId,
      }), "*");
    }
  }

  function throttle(fn, threshhold) {
    var last, timer;
    return function() {
      var context = this;

      var now = +new Date,
          args = arguments;
      if (last && now < last + threshhold) {
        // reset timeout
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          last = now;
          fn.apply(context, args);
        }, threshhold);
      } else {
        last = now;
        fn.apply(context, args);
      }
    };
  }

  var fns = {
    postMessage: function (message) {
      window.postMessage(message, "*");
    },
    getHTML: function () {
      return window.document.documentElement.outerHTML;
    },
    queryHTML: function (selector, attribute) {
      var attributes = attribute.split(",");

      return Array.prototype.map.call(
        window.document.querySelectorAll(selector),
        function (el) {
          if (attributes.length > 1) {
            return attributes.reduce( function (hash, attr) {
              hash[attr] = el[attr];
              return hash;
            }, {});
          } else {
            return el[attribute];
          }
        }
      );
    },
    getCookie: function () {
      try {
        return window.document.cookie;
      } catch (e) {
        if (e instanceof DOMException && e.name == "SecurityError") {
          return null;
        } else {
          throw e; // let others bubble up
        }
      }
    }
  };

  function onCore(msg) {
    var payload;

    if (isDead()) {
      return;
    }

    if (msg.data === "unload") {
      stop();
      return;
    }

    var matchesCurrentUrl = msg.data.url === currentURL();
   // wild card for cliqz URLS
   if(msg.data.url.indexOf('resource://cliqz') === 0){
     if(currentURL().indexOf(msg.data.url) === 0){
       matchesCurrentUrl = true;
     }
   }
    var isGetHTML = msg.data.action === 'getHTML';
    // TEMP: Human web decodes the URI for internal storage
    var isCurrentUrlBis = msg.data.url === decodeURIComponent(currentURL());

    if (!matchesCurrentUrl || (isGetHTML && !isCurrentUrlBis)) {
      return;
    }

    if ( !(msg.data.action in fns) ) {
      return;
    }

    try {
      payload = fns[msg.data.action].apply(null, msg.data.args || []);
      if (payload === null){
        return
      }
    } catch (e) {
      window.console.error("cliqz framescript:", e);
    }

    send({
      origin: 'content',
      payload: payload,
      requestId: msg.data.requestId
    });
  }

  function proxyWindowEvent(action) {
    return function (ev) {
      send({
        windowId: windowId,
        payload: {
          module: "core",
          action: action,
          args: [
            {
              target: {
                baseURI: ev.target.baseURI,
                windowTreeInformation: windowTreeInformation,
              }
            }
          ]
        }
      });
    };
  }

  var onMouseDown = function (ev) {
    send({
      windowId: windowId,
      payload: {
        module: "core",
        action: "recordMouseDown",
        args: [
          {
            target: {
              windowTreeInformation: windowTreeInformation,
              baseURI: ev.target.baseURI,
              value: ev.target.value,
              href: ev.target.href,
              parentNode: {
                href: ev.target.parentNode.href
              }
            }
          },
          getContextHTML(ev)
        ]
      }
    });
  };

  var onLoad = function (event) {
    if (config.modules.indexOf('green-ads') > -1 && MODE !== 'disabled') {
      greenAdsOnFullLoad({
        mode: MODE,
        url: currentURL(),
        window,
        send,
        windowId,
        windowTreeInformation,
        throttle,
      });
    }
  };

  var onReady = function (event) {
    if (config.modules.indexOf('adblocker') > -1) {
      adbCosmFilter(currentURL(), window, send, windowId, throttle);
    }

    if (config.modules.indexOf('green-ads') > -1 && MODE !== 'disabled') {
      greenAdsOnDOMLoaded({
        url: currentURL(),
        mode: MODE,
        inventory: INVENTORY,
        window,
        send,
        windowId,
        windowTreeInformation,
        throttle,
      });
    }

    // ReportLang
    var lang = window.document.getElementsByTagName('html')
      .item(0).getAttribute('lang');
    // don't analyse language for (i)frames
    var isTopWindow = !event.target.defaultView.frameElement;

    if (isTopWindow && lang) {
      send({
        windowId: windowId,
        payload: {
          module: "core",
          action: "recordLang",
          args: [
            currentURL(),
            lang
          ]
        }
      });
    }

    // ReportMeta
    var title = window.document.querySelector("title"),
        description = window.document.querySelector("meta[name=description]"),
        ogTitle = window.document.querySelector("meta[property='og:title']"),
        ogDescription = window.document.querySelector("meta[property='og:description']"),
        ogImage = window.document.querySelector("meta[property='og:image']");

    if (isTopWindow) {
      send({
        windowId: windowId,
        payload: {
          module: "core",
          action: "recordMeta",
          args: [
            currentURL(),
            {
              title: title && title.innerHTML,
              description: description && description.content,
              ogTitle: ogTitle && ogTitle.content,
              ogDescription: ogDescription && ogDescription.content,
              ogImage: ogImage && ogImage.content
            }
          ]
        }
      });
    }
  };

  runContentScripts(window);

  var onKeyPress = throttle(proxyWindowEvent("recordKeyPress"), 250);
  var onMouseMove = throttle(proxyWindowEvent("recordMouseMove"), 250);
  var onScroll = throttle(proxyWindowEvent("recordScroll"), 250);
  var onCopy = throttle(proxyWindowEvent("recordCopy"), 250);

  window.addEventListener("message", onMessage);
  window.addEventListener("keypress", onKeyPress);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("scroll", onScroll);
  window.addEventListener("copy", onCopy);
  window.addEventListener("DOMContentLoaded", onReady);
  window.addEventListener("load", onLoad);
  startListening("window-"+windowId, onCallback);
  startListening("cliqz:core", onCore);

  if (config.modules.indexOf('adblocker') > -1) {
    requestDomainRules(currentURL(), window, send, windowId);
  }

  if (config.modules.indexOf('green-ads') > -1 && MODE !== 'disabled') {
    greenAdsOnDOMCreated({
      mode: MODE,
      url: currentURL(),
      window,
      send,
      windowId,
      windowTreeInformation,
    });
  }

  if (config.modules.indexOf('anti-phishing') > -1 && window.parent.document.documentURI === window.document.documentURI) {
    isPhishingUrl(currentURL(), windowId, send);
  }

  function stop() {
    stopListening("window-"+windowId, onCallback);
    stopListening("cliqz:core", onCore);
    window.removeEventListener("message", onMessage);
    window.removeEventListener("keypress", onKeyPress);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("copy", onCopy);
    window.removeEventListener("DOMContentLoaded", onReady);
    window.removeEventListener("load", onLoad);
  }

  function isDead() {
    try {
      currentURL();
      return false;
    } catch(e) {
      stop();
      return true;
    }
  }

  window.addEventListener("unload", stop);
}

var DocumentManager = {

  init() {
    Services.obs.addObserver(this, "document-element-inserted", false);
  },

  uninit() {
    Services.obs.removeObserver(this, "document-element-inserted");
  },

  observe: function(document, topic, data) {
    let window = document && document.defaultView;
    if (!document || !document.location || !window) {
      return;
    }

    onDOMWindowCreated({
      target: {
        defaultView: window
      }
    }, true)
  }
}

DocumentManager.init();

// Create a new processScriptId
var processId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
  var r = Math.random()*16|0, v = c === "x" ? r : (r&0x3|0x8);
  return v.toString(16);
});


if (config.modules.indexOf('green-ads') > -1) {
  // Notify green-ads about this new process script.
  // The background will then send back the inventory and the green-ad mode
  send({
    payload: {
      module: 'green-ads',
      action: 'updateProcessScripts',
      args: [
        { processId, getInventory: true, getMode: true },
      ],
    },
  });
}


// Green ads state (once per process)
let MODE = 'disabled';
let INVENTORY = {
  maxAds: 3,
  tokens: {},
  ads: [],
  index: {},
};


function updateGreenAdsState(payload) {
  const inventory = payload.inventory;
  if (inventory) {
    INVENTORY = inventory;
  }

  const mode = payload.mode;
  if (mode) {
    MODE = mode;
  }
}


/**
 * Listen for messages on this particular process script
 */
function targetedMessageListener(msg) {
  if (msg.data) {
    updateGreenAdsState(msg.data);
  }
}

startListening('cliqz:process-script-' + processId, targetedMessageListener);

/**
 * make sure to unload propertly
 */
startListening("cliqz:process-script", function ps(msg) {
  if (msg.data === "unload") {
    DocumentManager.uninit();
    stopListening("cliqz:process-script", ps);
    stopListening("cliqz:process-script-" + processId, targetedMessageListener);
  } else {
    updateGreenAdsState(msg.data);
  }
});
