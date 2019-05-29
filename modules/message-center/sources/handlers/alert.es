import utils from '../../core/utils';
import CliqzMsgHandler from './base';

export default class CliqzMsgHandlerAlert extends CliqzMsgHandler {
  _renderMessage(message) {
    // TODO wait for window to open
    utils.getWindow().alert(message.text);
    if (this._callbacks[message.id]) {
      this._callbacks[message.id](message.id, message.options
         && message.options.length > 0 && message.options[0].action);
    }
    this.showNextMessage();
  }

  _hideMessage() {

  }
}
