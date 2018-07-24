import utils from '../../core/utils';
import CliqzMsgHandler from './base';
import UITour from '../../platform/ui-tour';

export default class CliqzMsgHandlerCallout extends CliqzMsgHandler {
  _renderMessage(message) {
    UITour.targets.set(message.target, { query: `#${message.target}`, widgetName: message.target, allowAdd: true });
    const targetPromise = UITour.getTarget(utils.getWindow(), message.target);
    targetPromise.then((target) => {
      setTimeout(() => {
        UITour.showInfo(utils.getWindow(), target,
          message.title,
          message.text,
          '',
          message.buttons);
      }, 1500);
    });
  }

  _hideMessage() {

  }
}
