import CliqzUtils from "core/utils";
import CliqzEvents from "core/events";
import CliqzMsgHandlerAlert from "message-center/handlers/alert";
import CliqzMsgHandlerDropdown from "message-center/handlers/dropdown";
import CliqzMsgHandlerFreshtab from "message-center/handlers/freshtab";
import CliqzMsgHandlerCallout from "message-center/handlers/callout";

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
  this.registerMessageHandler('MESSAGE_HANDLER_FRESHTAB',
    new CliqzMsgHandlerFreshtab());

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
  CliqzUtils.log("!!Get instance")
  CliqzMsgCenter.getInstance.instance =
    CliqzMsgCenter.getInstance.instance || new CliqzMsgCenter();
  return CliqzMsgCenter.getInstance.instance;
};
CliqzMsgCenter.getInstance();

export default CliqzMsgCenter;
