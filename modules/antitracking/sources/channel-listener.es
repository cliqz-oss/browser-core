export function ChannelListener(headerName) {
  this.headerName = headerName;
}

ChannelListener.prototype = {

  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsIStreamListener,
    Ci.nsIRequestObserver,
    Ci.nsIInterfaceRequestor,
    Ci.nsIChannelEventSink,
  ]),

  // nsIInterfaceRequestor
  getInterface: function (aIID) {
    try {
      return this.QueryInterface(aIID);
    } catch (e) {
      throw Components.results.NS_NOINTERFACE;
    }
  },

  // nsIChannelEventSink
  asyncOnChannelRedirect: function (aOldChannel, aNewChannel, aFlags, callback) {
    aOldChannel.QueryInterface(Components.interfaces.nsIHttpChannel)
    aNewChannel.QueryInterface(Components.interfaces.nsIHttpChannel)
    try {
      aOldChannel.getRequestHeader(this.headerName);  // make sure the old channel has cliqz header
      aNewChannel.setRequestHeader(this.headerName, ' ', false);
    }
    catch(e) {}
    callback.onRedirectVerifyCallback(Components.results.NS_OK);
  },
};