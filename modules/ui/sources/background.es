// Need to load views by hand so they will be ready once UI.js need them
// This should be moved to UI as soon as it will be moved from dist to sources
import background from 'core/base/background';
import { utils, events } from 'core/cliqz';
import v1 from "ui/views/currency";
import v3 from "ui/views/local-data-sc";
import v7 from "ui/views/generic";
import v8 from "ui/views/entity-generic";
import v9 from "ui/views/liveTicker";
import p1 from "ui/views/partials/location/missing_location_1";

const DISMISSED_ALERTS = 'dismissedAlerts';

export default background({
  init(settings) {
  },

  unload() {

  },

  actions: {
    checkShareLocationTrigger(result) {
      const dismissedAlerts = JSON.parse(utils.getPref(DISMISSED_ALERTS, '{}'));
      const messageType = 'share-location';
      const isDismissed = dismissedAlerts[messageType] && dismissedAlerts[messageType]['count'] >= 2 || false;

      const shouldTrigger = utils.getPref('extOnboardShareLocation', false)
             && result && result.isLocal
             && result.hasAskedForLocation
            && !isDismissed;
      if (shouldTrigger) {
        events.pub("ui:missing_location_shown");
      }
    }
  },

  events: {
    "result_click": function onClick(result) {
      this.actions.checkShareLocationTrigger(result);
    },
    "result_enter": function onEnter(result) {
      this.actions.checkShareLocationTrigger(result);
    },
    "autocomplete": function onAutoComplete(result) {
      this.actions.checkShareLocationTrigger(result);
    }
  }
});
