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
    },
    // The next two events came to be as a result for EX-3819 & EX-3905
    // For an unkown reason (@chrmod convinced it is FF bug), the browser (gecko?) is
    // reporting false status of the dropdown (popup) menu (closed when it's open). This in turn
    // triggers cliqz events that are handled when the popup is being closed and because it is not
    // really closed, it causes problems. Those next two event capturing, ensures that the popup
    // is hidden when it should be hidden (tab change & window content click)
    "core:tab_select": function onTabSelect() {
      events.pub('ui:popup_hide');
    },
    "core:mouse-down": function onMouseDown() {
      events.pub('ui:popup_hide');
    }
  }
});
