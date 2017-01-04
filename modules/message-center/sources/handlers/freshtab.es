import {utils, events} from 'core/cliqz';
import CliqzMsgHandler from "message-center/handlers/base";

export default class CliqzMsgHandlerFreshTab extends CliqzMsgHandler {

  _renderMessage(message) {
    events.pub('message-center:handlers-freshtab:new-message', message);
  }

  _hideMessage(message) {
    events.pub('message-center:handlers-freshtab:clear-message', message);
  }
}
