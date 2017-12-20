import TriggerBase from "./base";
import CliqzEvents from "../../core/events";

export default class UrlbarFocusTrigger extends TriggerBase {
  constructor() {
    super('TRIGGER_URLBAR_FOCUS');
    CliqzEvents.sub('core:urlbar_focus', this.notifyListeners.bind(this));
  }
}
