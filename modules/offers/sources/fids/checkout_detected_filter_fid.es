import { utils } from 'core/cliqz';
import { FID } from 'offers/fids/fid';
import OffersConfigs from 'offers/offers_configs';

//
// @brief This FID will be used to filter (return 1/0) depending if we detected
//        a checkout in a range of time or not. This way we can stop showing an ad
//        if we already did it in a N period of time.
//
export class CheckoutDetectedFilterFID extends FID {
  constructor() {
    super('checkoutDetectedFilter');
    this.args = {};
    // the user database
    this.userDB = null;

    this.configParams = {
      'deltaSecs' : {
        description: 'Time in seconds we dont want to show a new ad till at least pass deltaSecs',
        value: 10
      }
    };
  }

  configureDataBases(dbsMap) {
    // user_db is the name of the database
    // 'last_checkout' is the name of the key -> ts (number)
    //
    if (dbsMap['user_db']) {
      this.userDB = dbsMap['user_db'];
    } else {
      throw new Error('dbsMap doesnt have key: user_db');
    }
  }

  configureArgs(configArgs) {
    // set default values
    for(let k in this.configParams) {
      this.args[k] = Number(this.configParams[k]['value']) * 1000;
    }

    // Overwrite values with the once specified in the rule files
    for (let arg_idx in configArgs) {
        this.args[arg_idx] = Number(configArgs[arg_idx]) * 1000;
    }
}

  evaluate(intentInput, extras) {
    // we check if the variable exists, if not then we don't have nothing
    // to check
    if (!this.userDB['last_checkout']) {
      return 1.0;
    }

    // else we need to check if the current event is far away enough in time
    // to return 1
    let intentSession = intentInput.currentBuyIntentSession();
    const eventTimestamp = intentSession.lastEvent()['ts'];
    const lastCheckoutTimestamp = Number(this.userDB['last_checkout']);
    const diffTime = eventTimestamp - lastCheckoutTimestamp;
    return (diffTime >= this.args['deltaSecs']) ? 1.0 : 0.0;
  }
}
