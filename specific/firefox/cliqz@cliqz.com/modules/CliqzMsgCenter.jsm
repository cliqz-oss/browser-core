'use strict';

var EXPORTED_SYMBOLS = ['CliqzMsgCenter'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzEvents',
  'chrome://cliqzmodules/content/CliqzEvents.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzMsgHandler',
  'chrome://cliqzmodules/content/CliqzMsgHandlers/CliqzMsgHandler.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzMsgHandlerAlert',
  'chrome://cliqzmodules/content/CliqzMsgHandlers/CliqzMsgHandlerAlert.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzMsgHandlerDropdown',
  'chrome://cliqzmodules/content/CliqzMsgHandlers/CliqzMsgHandlerDropdown.jsm');


/* ************************************************************************* */
function _log(msg) {
	CliqzUtils.log(msg, 'CliqzMsgCenter');
}
/* ************************************************************************* */


function CliqzMsgCenter() {
  this._messageHandlers = {};
  this.showMessage = this.showMessage.bind(this);
  this.hideMessage = this.hideMessage.bind(this);

  this.registerMessageHandler('MESSAGE_HANDLER_DROPDOWN',
    new CliqzMsgHandlerDropdown());
  this.registerMessageHandler('MESSAGE_HANDLER_ALERT',
    new CliqzMsgHandlerAlert());

  CliqzEvents.sub('msg_center:show_message', this.showMessage);
  CliqzEvents.sub('msg_center:hide_message', this.hideMessage);
}

CliqzMsgCenter.prototype = {

  unload() {
    CliqzEvents.un_sub('msg_center:show_message', this.showMessage);
    CliqzEvents.un_sub('msg_center:hide_message', this.hideMessage);
  },

	registerMessageHandler: function (id, handler) {
		this._messageHandlers[id] = handler;
	},

  showMessage: function (message, handlerId, callback) {
    var handler = this._messageHandlers[handlerId];
    if (handler) {
      handler.enqueueMessage(message, callback);
    } else {
      _log('message handler not found: ' + handlerId);
    }
  },

  hideMessage: function (message, handlerId) {
    var handler = this._messageHandlers[handlerId];
    if (handler) {
      handler.dequeueMessage(message);
    } else {
      _log('message handler not found: ' + handlerId);
    }
  }
};

CliqzMsgCenter.getInstance = function () {
  CliqzMsgCenter.getInstance.instance =
    CliqzMsgCenter.getInstance.instance || new CliqzMsgCenter();
  return CliqzMsgCenter.getInstance.instance;
};
CliqzMsgCenter.getInstance();
