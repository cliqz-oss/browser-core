import { utils } from 'core/cliqz';
import { FID } from 'offers/fids/fid';
import LoggingHandler from 'offers/logging_handler';


const MODULE_NAME = 'session_count_fid';

// SessionCountFID
// will work in two different ways, by range or by lowerBound:
// Args:
//    - range: list of sessions we want to detect
//    - biggerThan: lowerBound to check, for example if biggerThan = 4 then the
//                  fid will return true for every session count > 4.
//
export class SessionCountFID extends FID {
  constructor() {
    super('sessionCount');
    this.range = null;
    this.biggerThan = -1;
  }

  configureDataBases(dbsMap) {
  }

  configureArgs(configArgs) {
    // set default values
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'configuring args: ' + JSON.stringify(configArgs));

    if (configArgs.hasOwnProperty('range')) {
      this.range = new Set(configArgs['range']);
    }
    if (configArgs.hasOwnProperty('biggerThan')) {
      this.biggerThan = configArgs['biggerThan'];
    }

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                        'configured with: ' +
                        '\n - range: ' + ((this.range) ? JSON.stringify(this.range) : 'null') +
                        '\n - biggerThan: ' + this.biggerThan);
  }

  evaluate(intentInput, extras) {
    // else we need to check if the current event is far away enough in time
    // to return 1
    let intentSession = intentInput.currentBuyIntentSession();
    const numSessions = intentSession.numOfSessions();

    // check if it is in the range?
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'numSessions: ' + numSessions);
    if (this.range) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'using range');
      return this.range.has(numSessions) ? 1.0 : 0.0;
    }

    // else we need to check the lower bound
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'using lowerBound: ' + this.biggerThan);
    return (numSessions >= this.biggerThan) ? 1.0 : 0.0;
  }
}
