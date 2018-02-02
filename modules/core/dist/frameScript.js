var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

try {
  Components.utils.import("resource://gre/modules/Console.jsm");
} catch(e) {
  // Older version of Firefox
  Components.utils.import("resource://gre/modules/devtools/Console.jsm");
}

var FLAGS = {
  STATE_START: Ci.nsIWebProgressListener.STATE_START,
  STATE_IS_DOCUMENT: Ci.nsIWebProgressListener.STATE_IS_DOCUMENT,
  STATE_REDIRECTING: Ci.nsIWebProgressListener.STATE_REDIRECTING,
};

function log() {
  var args = Array.prototype.slice.apply(arguments);
  args.unshift('Frame Script');
  args.unshift('CLIQZ');

  console.log.apply(console, args);
}

function send(payload) {
  sendAsyncMessage('cliqz', {
    payload: payload,
  });
}


function getWindowId(window) {
  return window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
    .getInterface(Components.interfaces.nsIDOMWindowUtils).outerWindowID;
}


function getWindowTreeInformation(window) {
  var currentWindow = window;

  // Keep track of window IDs
  var currentId = getWindowId(window);
  var windowId = currentId;
  var parentFrameId;

  while (currentId !== getWindowId(currentWindow.parent)) {
    // Go up one level
    parentFrameId = currentId;
    currentWindow = currentWindow.parent;
    currentId = getWindowId(currentWindow);
  }

  return {
    tabId: currentId,
    parentFrameId,
    frameId: windowId,
  };
}


function LocationObserver(webProgress) {
  this.webProgress = webProgress;
  this.previousURIMap = new WeakMap();
}

LocationObserver.prototype.QueryInterface = XPCOMUtils.generateQI([
  'nsIWebProgressListener',
  'nsISupportsWeakReference'
]);

LocationObserver.prototype.start = function () {
  const notifyFlags = Ci.nsIWebProgress.NOTIFY_LOCATION |
    Ci.nsIWebProgress.NOTIFY_STATE_WINDOW;
  this.webProgress.addProgressListener(this, notifyFlags);
};

LocationObserver.prototype.stop = function () {
  this.webProgress.removeProgressListener(this);
};

LocationObserver.prototype.onLocationChange = function onLocationChange(aWebProgress, aRequest, aURI, aFlags) {
  var windowTreeInformation;
  var window = null;
  var domWindowId;

  if (!aWebProgress.isTopLevel ||
      aWebProgress.sandboxFlags !== 0) {
    // Ignore "location change" events from non-toplevel frames or sandboxed documents.
    // For example "about:newtab" creates sandboxed browsers to capture page
    // screenshots, which is falsely detected as "location change", see EX-5218.
    return;
  }

  try {
    window = aWebProgress.DOMWindow;
  } catch (ex) {
    /* NS_ERROR_FAILURE - Indicates that there is no associated DOM window. */
  }

  try {
    domWindowId = aWebProgress.DOMWindowID;
  } catch (ex) {
    /* NS_NOINTERFACE */
  }

  if (window !== null) {
    windowTreeInformation = getWindowTreeInformation(window);
  }

  var document = aWebProgress.document;
  var isSameDocument = false;

  var referrer, triggeringURL, originalURL, status;

  try {

    if (aRequest) {
      var httpChannel = aRequest.QueryInterface(Ci.nsIHttpChannel);

      status = aRequest.responseStatus;
      referrer = (document && document.referrer)
        || (httpChannel.referrer && httpChannel.referrer.asciiSpec);

        originalURL = aRequest.originalURI.spec;

      triggeringURL = aRequest.loadInfo.triggeringPrincipal.URI && aRequest.loadInfo.triggeringPrincipal.URI.spec;
    } else if (aFlags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) {
      var previousURI = this.previousURIMap.get(window);

      if (previousURI) {
        triggeringURL = previousURI.spec;
      }

      isSameDocument = true;
    }

  } catch (e) {
    // some requests don't have originalURI and that is fine
  }

  this.previousURIMap.set(window, aURI);

  var msg = {
    url: aURI.spec,
    windowTreeInformation: windowTreeInformation,
    originalUrl: originalURL,
    referrer: referrer,
    status: status,
    triggeringUrl: triggeringURL,
    isPrivate: aWebProgress.usePrivateBrowsing,
    flags: aFlags,
    isLoadingDocument: aWebProgress.isLoadingDocument,
    isSameDocument: isSameDocument,
    domWindowId: domWindowId,
  };

  send({
    module: 'core',
    action: 'notifyLocationChange',
    args: [msg]
  });
};


LocationObserver.prototype.onStateChange = function onStateChange(aWebProgress, aRequest, aStateFlag, aStatus) {
  var triggeringURL, originalURL, windowTreeInformation, domWindowId;
  var window = null;

  try {
    window = aWebProgress.DOMWindow;
  } catch (ex) {
    /* NS_ERROR_FAILURE - Indicates that there is no associated DOM window. */
  }

  try {
    domWindowId = aWebProgress.DOMWindowID;
  } catch (ex) {
    /* NS_NOINTERFACE */
  }

  if (window !== null) {
    windowTreeInformation = getWindowTreeInformation(window);
  }

  if (!aRequest) {
    return;
  }

  try {
    triggeringURL = aRequest.loadInfo.triggeringPrincipal.URI.spec;
    originalURL = aRequest.originalURI.spec;
  } catch (e) {
    // no request no problem
  }

  var url;
  try {
    url = aRequest && aRequest.name;
  } catch (e) {
    // aRequest.name throws a NS_ERROR_NOT_IMPLEMENTED error if this is a view-source page
    // try to create the url from the URI instead
    url = aRequest && aRequest.URI && aRequest.URI.spec;
  }

  var msg = {
    url: url,
    urlSpec: aRequest && aRequest.URI && aRequest.URI.spec,
    originalUrl: originalURL,
    triggeringUrl: triggeringURL,
    isValid: (aStateFlag & FLAGS.STATE_START) && !aStatus,
    isNewPage: (FLAGS.STATE_START & aStateFlag) &&
      (FLAGS.STATE_IS_DOCUMENT & aStateFlag),
    windowID: domWindowId,
    windowTreeInformation: windowTreeInformation,
  };

  //log('msg state change', JSON.stringify(msg, null, 2))

  send({
    module: 'core',
    action: 'notifyStateChange',
    args: [msg]
  });
};

var webProgress = this.docShell
  .QueryInterface(Ci.nsIInterfaceRequestor)
  .getInterface(Ci.nsIWebProgress);

var locationObserver = new LocationObserver(webProgress);
locationObserver.start();

// Handler unload
addMessageListener("cliqz:process-script", function ps(msg) {
  if (msg.data.action === "unload") {
    locationObserver.stop();
    removeMessageListener("cliqz:process-script", ps);
  }
});
