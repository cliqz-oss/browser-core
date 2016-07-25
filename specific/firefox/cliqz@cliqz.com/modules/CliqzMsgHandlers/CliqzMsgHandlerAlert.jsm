'use strict';

var EXPORTED_SYMBOLS = ['CliqzMsgHandlerAlert'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzMsgHandlers/CliqzMsgHandler.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzMsgHandlerAlert = function () {
  CliqzMsgHandler.call(this);
};
CliqzMsgHandlerAlert.prototype = Object.create(CliqzMsgHandler.prototype);
CliqzMsgHandlerAlert.prototype.constructor = CliqzMsgHandlerAlert;
CliqzMsgHandlerAlert.prototype._renderMessage = function (message) {
    // TODO: wait for window to open
    CliqzUtils.getWindow().alert(message.text);
    if (this._callbacks[message.id]) {
      this._callbacks[message.id](message.id, message.options &&
        message.options.length > 0 && message.options[0].action);
    }
    this.showNextMessage();
  };
  CliqzMsgHandlerAlert.prototype._hideMessage = function () { };
