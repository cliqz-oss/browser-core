import CliqzUtils from "core/utils";
import CliqzMsgHandler from "message-center/handlers/base";

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

export default CliqzMsgHandlerAlert;
