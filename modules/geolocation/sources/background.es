import background from "core/base/background";
import { isFirefox } from "core/platform";
import { events, utils } from "core/cliqz";
import getGeo from "platform/geolocation";

// If the computer wakes up from a sleep that was longer than this many milliseconds, we update geolocation.
const GEOLOCATION_UPDATE_MIN_WAIT = 3600 * 1000;

/**
  @namespace geolocation
  @class Background
 */
export default background({

  // Number of decimal digits to keep in user's location
  LOCATION_ACCURACY: 3,

  GEOLOCATION_MESSAGE_NUM_SHOWN: 0,

  /**
    @method init
    @param settings
  */
  init(settings) {
    utils.SHARE_LOCATION_ONCE = false;
    utils.updateGeoLocation = this.actions.updateGeoLocation;

    this.sleepObserver = new TopicForwarder(
      events,
      "geolocation:sleep-notification",
      Date.now
    );

    this.wakeObserver = new TopicForwarder(
      events,
      "geolocation:wake-notification",
      Date.now
    );

    if (isFirefox) {
      this.observerService = Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService);

      this.observerService.addObserver(
        this.sleepObserver,
        "sleep_notification",
        false
      );

      this.observerService.addObserver(
        this.wakeObserver,
        "wake_notification",
        false
      );
    }
  },

  unload() {
    if (isFirefox) {
      this.observerService.removeObserver(
        this.sleepObserver,
        "sleep_notification"
      );
      this.observerService.removeObserver(
        this.wakeObserver,
        "wake_notification"
      );
    }
  },

  beforeBrowserShutdown() {

  },

  events: {
    "geolocation:update": function ({ timestamp }) {
      this.LAST_GEOLOCATION_UPDATE = timestamp;
    },

    "geolocation:wake-notification": function (timestamp) {
      const lastTimestamp = Math.max(
        this.LAST_SLEEP || 0,
        this.LAST_GEOLOCATION_UPDATE || 0
      );
      if (timestamp - lastTimestamp >= GEOLOCATION_UPDATE_MIN_WAIT) {
        this.actions.updateGeoLocation();
      }
    },

    "geolocation:sleep-notification": function (timestamp) {
      this.LAST_SLEEP = timestamp;
    },

    "ui:missing_location_shown": function() {
      if(!utils.getPref('share_location')) {
        this.GEOLOCATION_MESSAGE_NUM_SHOWN++;
      }

      if( this.GEOLOCATION_MESSAGE_NUM_SHOWN > 0) {
        events.pub(
          'msg_center:show_message',
          {
            "id": "share-location",
            "template": "share-location",
          },
          'MESSAGE_HANDLER_FRESHTAB'
        );
        this.GEOLOCATION_MESSAGE_NUM_SHOWN = 0;
      }
    },
  },

  roundLocation(position) {
    return utils.roundToDecimal(position, this.LOCATION_ACCURACY);
  },

  actions: {
    getGeo() {
      if (utils.getPref('share_location') !== 'yes' &&
          !utils.SHARE_LOCATION_ONCE) {
        return Promise.reject("No permission to get user's location");
      }

      const telemetryEvent = {
        type: "performance",
        action: "api_request",
        target: "geolocation",
        is_success: undefined,
      };
      return getGeo()
        .then(position => {
          telemetryEvent.is_success = true;
          utils.telemetry(telemetryEvent);
          return {
            latitude: this.roundLocation(position.latitude),
            longitude: this.roundLocation(position.longitude),
          };
        })
        .catch(error => {
          telemetryEvent.is_success = false;
          utils.telemetry(telemetryEvent);
          return Promise.reject(error);
        });
    },

    updateGeoLocation() {
      return this.actions.getGeo().then(position => {
        utils.USER_LAT = position.latitude;
        utils.USER_LNG = position.longitude;
        this.LAST_GEOLOCATION_UPDATE = Date.now();
      }).catch(() => {
        utils.USER_LAT = null;
        utils.USER_LNG = null;
      }).then(() => {
        return {
          latitude: utils.USER_LAT,
          longitude: utils.USER_LNG,
        };
      });
    },

    setLocationPermission(newPerm) {
      if (newPerm == "yes" || newPerm == "no" || newPerm == "ask") {
        utils.setPref('share_location',newPerm);
        this.actions.updateGeoLocation();
      }
    },
  },

});

class TopicForwarder {

  constructor(events, eventName, fn) {
    this.events = events;
    this.eventName = eventName;
    this.fn = fn;
  }

  observe(subject, topic, data) {
    this.events.pub(this.eventName, this.fn.apply(this, arguments));
  }

}
