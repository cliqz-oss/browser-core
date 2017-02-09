import { utils } from 'core/cliqz';
import { FID } from 'offers/fids/fid';
import OffersConfigs from 'offers/offers_configs';

//
// @brief This FID will be used to filter (return 1/0) depending if we detected
//        a checkout in the current intent session
//
export class CheckoutCurrIntentSessionFID extends FID {
  constructor() {
    super('checkoutCurrIntentSession');
  }

  configureDataBases(dbsMap) {
    // nothing to do
  }

  configureArgs(configArgs) {
    // nothing to do
}

  evaluate(intentInput, extras) {
    let intentSession = intentInput.currentBuyIntentSession();
    return intentSession.thereWasACheckout();
  }
}
