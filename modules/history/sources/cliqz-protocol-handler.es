/* eslint-disable */
var { classes: Cc, interfaces: Ci, utils: Cu } = Components;

function CliqzChannel(aUri, aScript) {
  // nsIRequest
  this.loadFlags = 0;
  this.loadGroup = null;
  this.name = aUri.spec;
  this.status = 200;
  this.content = '';

  // nsIChannel
  this.contentCharset = 'utf-8';
  this.contentLength = this.content.length;
  this.contentType = 'application/cliqz';
  this.notificationCallbacks = null;
  this.originalURI = aUri;
  this.owner = null;
  this.securityInfo = null;
  this.URI = aUri;
}

// nsIChannel
CliqzChannel.prototype.asyncOpen = function(aListener, aContext) {
  var query = this.URI.spec.split("=")[1];

  if (query) {
    send({
      payload: {
        module: "core",
        action: "queryCliqz",
        args: [
          decodeURIComponent(query)
        ]
      }
    });
  }
};

////////////////////////////////////////////////////////////////////////////////
var flags = Ci.nsIProtocolHandler;

export default {
  _classDescription: 'Protocol handler for "cliqz:"',
  _classID: Components.ID('{12dede52-defd-11e6-bf01-fe55135034f3}'),
  _contractID:  '@mozilla.org/network/protocol;1?name=cliqz',

  QueryInterface: XPCOMUtils.generateQI([
      Ci.nsIFactory,
      Ci.nsIProtocolHandler,
      Ci.nsISupportsWeakReference
      ]),

  init: function() {
    try {
      var registrar = Components.manager.QueryInterface(
          Ci.nsIComponentRegistrar);
      registrar.registerFactory(
          this._classID, this._classDescription, this._contractID, this);
    } catch (e) {
      if ('NS_ERROR_FACTORY_EXISTS' == e.name) {
        // No-op, ignore these.  But why do they happen!?
      } else {
        dump('Error registering ScriptProtocol factory:\n' + e + '\n');
      }
      return;
    };
  },

////////////////////////////////// nsIFactory //////////////////////////////////

  createInstance: function(outer, iid) {
    if (outer) {
      throw Cr.NS_ERROR_NO_AGGREGATION;
    }
    return this
    return this.QueryInterface(iid);
  },

////////////////////////////// nsIProtocolHandler //////////////////////////////

  scheme: 'cliqz',

  defaultPort: -1,

  protocolFlags: 0 |
    flags.URI_NORELATIVE |
    flags.URI_NOAUTH |
    flags.URI_INHERITS_SECURITY_CONTEXT |
    flags.URI_LOADABLE_BY_ANYONE |
    flags.URI_NON_PERSISTABLE |
    flags.URI_OPENING_EXECUTES_SCRIPT,

  allowPort: function(aPort, aScheme) {
    return false;
  },

  newURI: function(aSpec, aCharset, aBaseUri) {
    var uri = Cc['@mozilla.org/network/simple-uri;1']
        .createInstance(Ci.nsIURI);
      uri.spec = aSpec;
    return uri;
  },

  newChannel: function(aUri) {
    return new CliqzChannel(aUri);
  }
};
/* eslint-enable */
