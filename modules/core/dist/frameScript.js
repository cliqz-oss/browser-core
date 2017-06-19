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
  if ( !aWebProgress.isTopLevel ) {
    return;
  }

  var window = aWebProgress.DOMWindow;
  var document = aWebProgress.document;
  var isSameDocument = false;

  var referrer, triggeringURL, originalURL;

  try {

    if (aRequest) {
      var httpChannel = aRequest.QueryInterface(Ci.nsIHttpChannel);

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
    originalUrl: originalURL,
    referrer: referrer,
    triggeringUrl: triggeringURL,
    isPrivate: aWebProgress.usePrivateBrowsing,
    flags: aFlags,
    isLoadingDocument: aWebProgress.isLoadingDocument,
    isSameDocument: isSameDocument,
    domWindowId: aWebProgress.DOMWindowID
  };

  //log('msg location change', JSON.stringify(msg, null, 2))

  send({
    module: 'core',
    action: 'notifyLocationChange',
    args: [msg]
  });
};

LocationObserver.prototype.onStateChange = function onStateChange(aWebProgress, aRequest, aStateFlag, aStatus) {
  var triggeringURL, originalURL;

  if (!aRequest) {
    return;
  }

  try {
    if ( !aWebProgress.isTopLevel ) {
      triggeringURL = aRequest.loadInfo.triggeringPrincipal.URI.spec;
      originalURL = aRequest.originalURI.spec;
    }
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
    windowID: aWebProgress.DOMWindowID,
  };

  //log('msg state change', JSON.stringify(msg, null, 2))

  send({
    module: 'core',
    action: 'notifyStateChange',
    args: [msg]
  });
};

//log('new')

var webProgress = this.docShell
  .QueryInterface(Ci.nsIInterfaceRequestor)
  .getInterface(Ci.nsIWebProgress);

var locationObserver = new LocationObserver(webProgress);
locationObserver.start();

// Handler unload
addMessageListener("cliqz:process-script", function ps(msg) {
  if (msg.data === "unload") {
    locationObserver.stop();
    removeMessageListener("cliqz:process-script", ps);
  }
});
