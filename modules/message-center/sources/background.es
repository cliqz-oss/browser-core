/* eslint func-names: 'off' */

import background from '../core/base/background';
import { product } from '../core/platform';
import MessageCenter from './message-center';
import MessageHandlerBase from './handlers/base';
import Triggers from './triggers/triggers';

/**
  @namespace message-center
  @module message-center
  @class Background
 */
export default background({
  requiresServices: ['cliqz-config'],

  /**
    @method init
    @param settings
  */
  init() {
    this.messageCenter = new MessageCenter();
    if (product !== 'GHOSTERY') {
      (new Triggers()).init();
    }
  },

  unload() {
  },

  beforeBrowserShutdown() {

  },

  events: {
    'msg_center:show_message': function (...args) {
      this.messageCenter.showMessage.call(this.messageCenter, ...args);
    },
    'msg_center:hide_message': function (...args) {
      this.messageCenter.hideMessage.call(this.messageCenter, ...args);
    },
    'msg_center:pause_message': function (...args) {
      this.messageCenter.pauseMessage.call(this.messageCenter, ...args);
    },
    'offers-send-ch': function onNewOffer(offer) {
      const DEST_TO_HANDLERS = {
        ghostery: 'ghostery',
      };

      offer.dest
        .map(dest => DEST_TO_HANDLERS[dest])
        .filter(handler => handler)
        .forEach(handler => this.messageCenter.showMessage(offer, handler));
    },
  },

  actions: {
    registerMessageHandler(id, handler) {
      class NewMessageHandler extends MessageHandlerBase {
        _renderMessage(message) {
          handler(message);
        }

        _hideMessage() {
          // TODO
        }
      }
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
    },
    pauseMessage(handlerID, message, dated) {
      this.messageCenter.pauseMessage(message, handlerID, dated);
    }
  },
});
