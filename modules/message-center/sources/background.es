import background from "../core/base/background";
import MessageCenter from "./message-center";
import MessageHandlerBase from './handlers/base';
import CliqzMsgTriggerLocal from "./triggers/local";

/**
  @namespace message-center
  @module message-center
  @class Background
 */
export default background({

  /**
    @method init
    @param settings
  */
  init(settings) {
    this.messageCenter = MessageCenter.getInstance();
    const localTrigger = new CliqzMsgTriggerLocal();
    localTrigger.init();
  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  events: {
    'msg_center:show_message': function () {
      this.messageCenter.showMessage.apply(this.messageCenter, arguments);
    },
    'msg_center:hide_message': function () {
      this.messageCenter.hideMessage.apply(this.messageCenter, arguments);
    },
  },

  actions: {
    registerMessageHandler(id, handler) {
      class NewMessageHandler extends MessageHandlerBase {
        _renderMessage(message) {
          handler(message);
        }

        _hideMessage(message) {
          // TODO
        }
      };
      this.messageCenter.registerMessageHandler(id, new NewMessageHandler());
    },
    getHandlers() {
      return this.messageCenter.getHandlers();
    },
    showMessage(handler, message) {
      this.messageCenter.showMessage(message, handler);
    },
    hideMessage(handlerID, message) {
      this.messageCenter.hideMessage(message, handlerID);
    }
  },
});

