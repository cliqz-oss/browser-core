/* eslint func-names: 'off' */

import background from '../core/base/background';
import { isBootstrap } from '../core/platform';
import utils from '../core/utils';
import events from '../core/events';
import getGeo from '../core/geolocation';
import inject from '../core/kord/inject';
import config from '../core/config';
import Defer from '../core/helpers/defer';
import prefs from '../core/prefs';

// If the computer wakes up from a sleep that was longer than this many milliseconds,
// we update geolocation.
const GEOLOCATION_UPDATE_MIN_WAIT = 3600 * 1000;

function roundToDecimal(number, digits) {
  const multiplier = 10 ** digits;
  return Math.round(number * multiplier) / multiplier;
}

class TopicForwarder {
  constructor(_events, eventName, fn) {
    this.events = _events;
    this.eventName = eventName;
    this.fn = fn;
  }

  observe(...args) {
    this.events.pub(this.eventName, this.fn.call(this, ...args));
  }
}

/**
  @namespace geolocation
  @module geolocation
  @class Background
 */
export default background({

  // Number of decimal digits to keep in user's location
  LOCATION_ACCURACY: 3,

  GEOLOCATION_MESSAGE_NUM_SHOWN: 0,

  messageCenter: inject.module('message-center'),

  /**
    @method init
    @param settings
  */
  init() {
    utils.updateGeoLocation = this.actions.updateGeoLocation;

    this.cancelUpdate = new Defer();

    this.sleepObserver = new TopicForwarder(
      events,
      'geolocation:sleep-notification',
      Date.now
    );

    this.wakeObserver = new TopicForwarder(
      events,
      'geolocation:wake-notification',
      Date.now
    );

    this.getRawGeolocationData = getGeo;

    if (isBootstrap) {
      this.observerService = Components.classes['@mozilla.org/observer-service;1']
        .getService(Components.interfaces.nsIObserverService);

      this.observerService.addObserver(
        this.sleepObserver,
        'sleep_notification',
        false
      );

      this.observerService.addObserver(
        this.wakeObserver,
        'wake_notification',
        false
      );
    }
  },

  unload() {
    if (isBootstrap) {
      this.observerService.removeObserver(
        this.sleepObserver,
        'sleep_notification'
      );
      this.observerService.removeObserver(
        this.wakeObserver,
        'wake_notification'
      );
    }
  },

  beforeBrowserShutdown() {

  },

  events: {
    'geolocation:update': function ({ timestamp }) {
      this.LAST_GEOLOCATION_UPDATE = timestamp;
    },

    'geolocation:wake-notification': function (timestamp) {
      const lastTimestamp = Math.max(
        this.LAST_SLEEP || 0,
        this.LAST_GEOLOCATION_UPDATE || 0
      );
      if (timestamp - lastTimestamp >= GEOLOCATION_UPDATE_MIN_WAIT) {
        this.actions.updateGeoLocation();
      }
    },

    'geolocation:sleep-notification': function (timestamp) {
      this.LAST_SLEEP = timestamp;
    },

    'ui:missing_location_shown': function () {
      if (!prefs.get('share_location')) {
        this.GEOLOCATION_MESSAGE_NUM_SHOWN += 1;
      }

      if (this.GEOLOCATION_MESSAGE_NUM_SHOWN > 0) {
        this.messageCenter.action(
          'showMessage',
          'MESSAGE_HANDLER_FRESHTAB',
          {
            id: 'share-location',
            template: 'share-location',
          }
        ).then(() => {
          this.GEOLOCATION_MESSAGE_NUM_SHOWN = 0;
        });
      }
    },
  },

  roundLocation(position) {
    return roundToDecimal(position, this.LOCATION_ACCURACY);
  },

  actions: {
    getGeo() {
      const locationPref = prefs.get('share_location', config.settings.geolocation || 'ask');
      if (!['yes', 'showOnce'].includes(locationPref)) {
        return Promise.reject(new Error("No permission to get user's location"));
      }
      const telemetryEvent = {
        type: 'performance',
        action: 'api_request',
        target: 'geolocation',
        is_success: undefined,
      };
      return Promise.race([
        this.getRawGeolocationData(),
        this.cancelUpdate.promise
      ])
        .then((position) => {
          telemetryEvent.is_success = true;
          utils.telemetry(telemetryEvent);
          return {
            latitude: this.roundLocation(position.latitude),
            longitude: this.roundLocation(position.longitude),
          };
        })
        .catch((error) => {
          if (error.canceled) {
            telemetryEvent.is_canceled = true;
          }
          telemetryEvent.is_success = false;
          utils.telemetry(telemetryEvent);
          return Promise.reject(error);
        });
    },

    updateGeoLocation() {
      return this.actions.getGeo().then((position) => {
        utils.USER_LAT = position.latitude;
        utils.USER_LNG = position.longitude;
        this.LAST_GEOLOCATION_UPDATE = Date.now();
      }).catch(() => {
        utils.USER_LAT = null;
        utils.USER_LNG = null;
      }).then(() =>
        ({
          latitude: utils.USER_LAT,
          longitude: utils.USER_LNG,
        }));
    },

    setLocationPermission(newPerm) {
      if (newPerm === 'yes' || newPerm === 'no' || newPerm === 'ask') {
        prefs.set('share_location', newPerm);
        this.actions.updateGeoLocation();
      }
    },

    resetGeoLocation() {
      this.cancelUpdate.reject({
        canceled: true,
      });
      this.cancelUpdate = new Defer();
      utils.USER_LAT = null;
      utils.USER_LNG = null;
    },
  },
});
