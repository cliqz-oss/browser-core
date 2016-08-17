import TriggerBase from "campaign-manager/triggers/base";
import CliqzEvents from "core/events";

export default class extends TriggerBase {
  constructor() {
    super('TRIGGER_URLBAR_FOCUS');
    CliqzEvents.sub('core:urlbar_focus', this.notifyListeners.bind(this));
  }
}
