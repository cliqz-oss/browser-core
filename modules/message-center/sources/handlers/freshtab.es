import {utils, events} from '../../core/cliqz';
import CliqzMsgHandler from "./base";
import inject from "../../core/kord/inject";


export default class CliqzMsgHandlerFreshTab extends CliqzMsgHandler {

  _renderMessage(message) {
    inject.module('freshtab').isReady().then(() => {
      events.pub('message-center:handlers-freshtab:new-message', message);
    });
  }

  _hideMessage(message) {
    events.pub('message-center:handlers-freshtab:clear-message', message);
  }
}
