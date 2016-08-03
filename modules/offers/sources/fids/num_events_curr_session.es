import { FID } from 'offers/fids/fid';
import LoggingHandler from 'offers/logging_handler';


const MODULE_NAME = 'num_events_curr_session_fid';

//
// @brief This class will be in charge of checking how many visits to the cluster
//        do we have in between a range (using a delta value to check [N-delta,N+delta])
// Arguments:
//  N: the number of visits to check.
//  delta: the delta number of visits to check.
//
// TODO: if we want to do this generic we need to add the value in the database
//       so we can do it generic for all the clusters...
//
export class NumEventsCurrSessionFID extends FID {
  constructor() {
    super('numEventsCurrSession');
    this.lowerBound = 0;
    this.upperBound = 0;

    // this.configParams = {
    //   'N' : {
    //     description: 'N means the number of visits where we will activate this FID and return 1',
    //     value: 1
    //   },
    //   'delta' : {
    //     description: 'The delta number of visits to check',
    //     value: 1
    //   }
    // };
  }

  configureDataBases(dbsMap) {
    // nothing to do for now
  }

  configureArgs(configArgs) {
    // set default values
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'configuring args: ' + JSON.stringify(configArgs));

    if (configArgs['N'] < 0 || configArgs['delta'] < 0) {
      return;
    }

    this.lowerBound = configArgs['N'] - configArgs['delta'];
    this.upperBound = configArgs['N'] + configArgs['delta'];
  }

  evaluate(intentInput, extras) {
    // if we are being called is because there we are visiting the cluster again
    // so we just need to increment a counter or even easier, just count the
    // number of events
    let intentSession = intentInput.currentBuyIntentSession();
    const numOfEvents = intentSession.getCurrentSession().length;
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                        'numOfEvents: ' + numOfEvents +
                        ' - this.lowerBound: ' + this.lowerBound +
                        ' - this.upperBound: ' + this.upperBound);
    if (numOfEvents >= this.lowerBound && numOfEvents <= this.upperBound) {
      return 1.0;
    }
    return 0.0;
  }
}
