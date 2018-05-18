import events from '../../core/events';
import CliqzMsgHandler from './base';
import inject from '../../core/kord/inject';


export default class CliqzMsgHandlerFreshTabTop extends CliqzMsgHandler {
  _renderMessage(message) {
    inject.module('freshtab').isReady().then(() => {
      events.pub('message-center:handlers-freshtab:new-message', message);
    }).catch(); // no freshtab, no problem
  }

  _hideMessage(message) {
    events.pub('message-center:handlers-freshtab:clear-message', message);
  }
}
