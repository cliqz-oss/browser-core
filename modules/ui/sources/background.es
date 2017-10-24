// Need to load views by hand so they will be ready once UI.js need them
// This should be moved to UI as soon as it will be moved from dist to sources
import background from 'core/base/background';
import { utils, events } from 'core/cliqz';
import prefs from 'core/prefs';

const DISMISSED_ALERTS = 'dismissedAlerts';
const SEARCH_BAR_ID = 'search-container';
const showSearchBar = 'dontHideSearchBar';

export default background({
  init(settings) {
    // we use CustomizableUI since 2.21.1
    prefs.clear('defaultSearchBarPosition');
    prefs.clear('defaultSearchBarPositionNext');


    if (!prefs.get(showSearchBar, false)) {
      // we always hide the saerch bar when Cliqz starts
      // as long as the user did not move it somewhere visible (showSearchBar pref)
      let CustomizableUI = Components.utils.import('resource:///modules/CustomizableUI.jsm', null).CustomizableUI;
      CustomizableUI.removeWidgetFromArea(SEARCH_BAR_ID);
    }
  },

  unload() {
    this.restoreSearchBar();
  },

  beforeBrowserShutdown() {
    this.restoreSearchBar();
  },

  restoreSearchBar() {
    let CustomizableUI = Components.utils.import('resource:///modules/CustomizableUI.jsm', null).CustomizableUI;
    if (CustomizableUI.getPlacementOfWidget(SEARCH_BAR_ID) !== null) {
      // if the user moves the searchbar - we let him in full control
      prefs.set(showSearchBar, true);
    } else {
      // we always try to restore the searchbar close to the urlbar
      // both at shutdown and uninstall
      const urlbarPlacement = CustomizableUI.getPlacementOfWidget('urlbar-container');
      CustomizableUI.addWidgetToArea(SEARCH_BAR_ID, CustomizableUI.AREA_NAVBAR, urlbarPlacement.position + 1);
    }
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
