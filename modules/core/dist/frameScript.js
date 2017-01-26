var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Console.jsm")

var FLAGS = {
  STATE_START: Ci.nsIWebProgressListener.STATE_START,
  STATE_IS_DOCUMENT: Ci.nsIWebProgressListener.STATE_IS_DOCUMENT,
};

function log() {
  var args = Array.prototype.slice.apply(arguments);
  args.unshift(content.window.location.toString());
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

  if ( !aRequest ) {
    return;
  }

  // only react to network related requests
  if ( ['http', 'https'].indexOf(aURI.scheme) === -1 ) {
    return;
  }

  var httpChannel = aRequest.QueryInterface(Ci.nsIHttpChannel);

  var referrer = (aWebProgress.DOMWindow && aWebProgress.DOMWindow.document.referrer)
    || (httpChannel.referrer && httpChannel.referrer.asciiSpec);

  var msg = {
    url: aURI.spec,
    referrer: referrer,
    isPrivate: aWebProgress.usePrivateBrowsing,
    flags: aFlags,
    isLoadingDocument: aWebProgress.isLoadingDocument,
    domWindowId: aWebProgress.DOMWindowID
  };

  //log('msg location change', JSON.stringify(msg))

  send({
    module: 'core',
    action: 'notifyLocationChange',
    args: [msg]
  });
};

LocationObserver.prototype.onStateChange = function onStateChange(aWebProgress, aRequest, aStateFlag, aStatus) {
  var msg = {
    url: aRequest && aRequest.name,
    urlSpec: aRequest && aRequest.URI && aRequest.URI.spec,
    isValid: (aStateFlag & FLAGS.STATE_START) && !aStatus,
    isNewPage: (FLAGS.STATE_START & aStateFlag) &&
      (FLAGS.STATE_IS_DOCUMENT & aStateFlag),
    windowID: aWebProgress.DOMWindowID,
  };

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
