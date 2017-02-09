import { utils } from 'core/cliqz';
import { FID } from 'offers/fids/fid';

//
// @brief This FID will be used to filter (return 1/0) depending if there was an
//        offer shown on the current session or not.
//
export class OfferShownCurrentSessionFID extends FID {
  constructor() {
    super('offerShownCurrentSession');
    // the user database
    this.userDB = null;
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
    // nothing to do
  }

  evaluate(intentInput, extras) {
    // we check if the variable exists, if not then we don't have nothing
    // to check
    if (!this.userDB['last_ad_shown']) {
      return 0.0;
    }

    // else we need to check if the current event is far away enough in time
    // to return 1
    let intentSession = intentInput.currentBuyIntentSession();
    const eventTimestamp = intentSession.firstIntentEvent()['ts'];
    const lastAddShownTimestamp = Number(this.userDB['last_ad_shown']);
    // if the add was shown after the first event => is the current
    // session.
    return (lastAddShownTimestamp >= eventTimestamp) ? 1.0 : 0.0;
  }
}
