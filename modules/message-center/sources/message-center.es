import console from '../core/console';
import CliqzMsgHandlerAlert from './handlers/alert';
import CliqzMsgHandlerDropdown from './handlers/dropdown';
import CliqzMsgHandlerFreshtabTop from './handlers/freshtab-top';
import CliqzMsgHandlerFreshtabMiddle from './handlers/freshtab-middle';
import CliqzMsgHandlerFreshtabOffers from './handlers/freshtab-offers';
import CliqzMsgHandlerFreshtabCliqzPost from './handlers/freshtab-cliqzpost';

/* ************************************************************************* */
function _log(msg) {
  console.log(msg, 'CliqzMsgCenter');
}
/* ************************************************************************* */


export default class CliqzMsgCenter {
  constructor() {
    this._messageHandlers = {};

    this.showMessage = this.showMessage.bind(this);
    this.hideMessage = this.hideMessage.bind(this);

    this.registerMessageHandler('MESSAGE_HANDLER_DROPDOWN',
      new CliqzMsgHandlerDropdown());
    this.registerMessageHandler('MESSAGE_HANDLER_ALERT',
      new CliqzMsgHandlerAlert());
    this.registerMessageHandler('MESSAGE_HANDLER_FRESHTAB_TOP',
      new CliqzMsgHandlerFreshtabTop());
    this.registerMessageHandler('MESSAGE_HANDLER_FRESHTAB_MIDDLE',
      new CliqzMsgHandlerFreshtabMiddle());
    this.registerMessageHandler('MESSAGE_HANDLER_FRESHTAB_OFFERS',
      new CliqzMsgHandlerFreshtabOffers());
    this.registerMessageHandler('MESSAGE_HANDLER_FRESHTAB_CLIQZPOST',
      new CliqzMsgHandlerFreshtabCliqzPost());
  }

  registerMessageHandler(id, handler) {
    this._messageHandlers[id] = handler;
  }

  getHandlers() {
    return Object.keys(this._messageHandlers);
  }

  showMessage(message, handlerId, callback) {
    const handler = this._messageHandlers[handlerId];
    if (handler) {
      handler.enqueueMessage(message, callback);
    } else {
      _log(`message handler not found: ${handlerId}`);
    }
  }

  hideMessage(message, handlerId) {
    const handler = this._messageHandlers[handlerId];
    if (handler) {
      handler.dequeueMessage(message);
    } else {
      _log(`message handler not found: ${handlerId}`);
    }
  }

  pauseMessage(message, handlerId) {
    const handler = this._messageHandlers[handlerId];
    if (handler) {
      handler.dequeueMessage(message);
    } else {
      _log(`message handler not found: ${handlerId}`);
    }
  }

  static getInstance() {
    CliqzMsgCenter.getInstance.instance = CliqzMsgCenter.getInstance.instance
      || new CliqzMsgCenter();
    return CliqzMsgCenter.getInstance.instance;
  }
}
