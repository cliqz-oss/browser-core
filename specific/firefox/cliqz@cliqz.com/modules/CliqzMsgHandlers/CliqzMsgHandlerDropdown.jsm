'use strict';

var EXPORTED_SYMBOLS = ['CliqzMsgHandlerDropdown'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzMsgHandlers/CliqzMsgHandler.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzEvents',
  'chrome://cliqzmodules/content/CliqzEvents.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

function CliqzMsgHandlerDropdown() {
  CliqzMsgHandler.call(this);
  CliqzEvents.sub('ui:dropdown_message_click', this._onClick.bind(this));
}

CliqzMsgHandlerDropdown.prototype = Object.create(CliqzMsgHandler.prototype);
CliqzMsgHandlerDropdown.prototype.constructor = CliqzMsgHandlerDropdown;

CliqzMsgHandlerDropdown.prototype._renderMessage = function (message) {
  CliqzEvents.pub('msg_handler_dropdown:message_ready', this._convertMessage(message));
};

CliqzMsgHandlerDropdown.prototype._hideMessage = function (message) {
  CliqzEvents.pub('msg_handler_dropdown:message_revoked', this._convertMessage(message));
};

// converts message into format expected by UI
CliqzMsgHandlerDropdown.prototype._convertMessage = function (message) {
  return {
    'footer-message': {
      simple_message: message.text,
      type: 'cqz-message-survey',
      location: message.location,
      options: (message.options || []).map(function (el) {
        return {
          text: el.label,
          state: el.style,
          action: el.action
        };
      })
  }};
};

CliqzMsgHandlerDropdown.prototype._onClick = function (action) {
  var message = this._messageQueue[0];

  // not thread-safe: if current message is removed while it is showing,
  // the next message is used when invoking the callback
  if (message && this._callbacks[message.id]) {
    this._callbacks[message.id](message.id, action);
  }
};

