import utils from "core/utils";
import events from "core/events";
import CliqzMsgHandler from "message-center/handlers/base";

export default class CliqzMsgHandlerDropdown extends CliqzMsgHandler {
  constructor() {
    super();
    events.sub('ui:dropdown_message_click', this._onClick.bind(this));
  }

  _renderMessage(message) {
    events.pub('msg_handler_dropdown:message_ready', this._convertMessage(message));
  }

  _hideMessage(message) {
    events.pub('msg_handler_dropdown:message_revoked', this._convertMessage(message));
  }

  _convertMessage(message) {
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
      }
    };
  }

  _onClick(action) {
    var message = this._messageQueue[0];
    // not thread-safe: if current message is removed while it is showing,
    // the next message is used when invoking the callback
    if (message && this._callbacks[message.id]) {
      this._callbacks[message.id](message.id, action);
    }
  }
}
