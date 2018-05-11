import { utils, events } from '../../core/cliqz';
import CliqzMsgHandler from "./base";
import UITour from '../../platform/ui-tour';

export default class CliqzMsgHandlerCallout extends CliqzMsgHandler {

  _renderMessage(message) {
    UITour.targets.set(message.target, { query: '#' + message.target, widgetName: message.target, allowAdd: true });
    var targetPromise = UITour.getTarget(utils.getWindow(), message.target);
    targetPromise.then(function(target) {
      utils.setTimeout(function() {
        UITour.showInfo(utils.getWindow(), target,
        message.title,
        message.text,
        "",
        message.buttons);
      }, 1500);
    });
  }

  _hideMessage(message) {

  }
}
