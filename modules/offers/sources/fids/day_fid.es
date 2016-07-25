import { utils } from 'core/cliqz';
import { FID } from 'offers/fids/fid';
import LoggingHandler from 'offers/logging_handler';


const MODULE_NAME = 'day_fid';

//
// @brief This FID will be used to filter (return 1/0) depending if we detected
//        a signal in a range of time or not. This way we can stop showing an ad
//        if we already did it in a N period of time.
//
export class DayFID extends FID {
  constructor() {
    super('day');
    this.daysSet = null;
  }

  configureDataBases(dbsMap) {
  }

  configureArgs(configArgs) {
     // set default values
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'configuring args: ' + JSON.stringify(configArgs));

    if (configArgs.hasOwnProperty('range')) {
      this.daysSet = new Set(configArgs['range']);
    }
  }

  evaluate(intentInput, extras) {
    if (!this.daysSet) {
      return 0.0;
    }

    // else we need to check if the current event is far away enough in time
    // to return 1
    let intentSession = intentInput.currentBuyIntentSession();
    const eventTimestamp = intentSession.lastEvent()['ts'];

    // Create a new JavaScript Date object based on the timestamp
    // multiplied by 1000 so that the argument is in milliseconds, not seconds.
    let date = new Date(eventTimestamp);
    // Hours part from the timestamp
    const day = date.getDay();

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                        'current_day: ' + day +
                        ' isInSet: ' + this.daysSet.has(day));

    return this.daysSet.has(day) ? 1.0 : 0.0;
  }
};
