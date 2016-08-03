import LoggingHandler from 'offers/logging_handler';
// fids
import { TopHourFID }  from 'offers/fids/top_hour_fid';
import { TopClusterVisitsFID } from 'offers/fids/top_cluster_visits_fid';
import { SignalDetectedFilterFID } from 'offers/fids/signal_detected_filter_fid';
import { CheckoutDetectedFilterFID } from 'offers/fids/checkout_detected_filter_fid';
import { HourFID } from 'offers/fids/hour_fid';
import { DayFID } from 'offers/fids/day_fid';
import { SessionCountFID } from 'offers/fids/session_count';
import { NumEventsCurrSessionFID } from 'offers/fids/num_events_curr_session';
import { OfferShownCurrentSessionFID } from 'offers/fids/offer_shown_current_session';
import { CheckoutCurrIntentSessionFID } from 'offers/fids/checkout_curr_intent_session_fid';



const MODULE_NAME = 'fids_builder';


////////////////////////////////////////////////////////////////////////////////
export class FIDsBuilder {
  constructor() {
  }

  //
  // @brief Build a new fid from the id name
  // @return a new instance of that FID type || null on error
  //
  buildFID(fidIDName) {

    var fid = null;
    switch (fidIDName) {
    case 'topClusterVisits':
      fid = new TopClusterVisitsFID();
      break;
    case 'signalDetectedFilter':
      fid = new SignalDetectedFilterFID();
      break;
    case 'checkoutDetectedFilter':
      fid = new CheckoutDetectedFilterFID();
      break;
    case 'hour':
      fid = new HourFID();
      break;
    case 'day':
      fid = new DayFID();
      break;
    case 'sessionCount':
      fid = new SessionCountFID();
      break;
    case 'numEventsCurrSession':
      fid = new NumEventsCurrSessionFID();
      break;
    case 'offerShownCurrentSession':
      fid = new OfferShownCurrentSessionFID();
      break;
    case 'checkoutCurrIntentSession':
      fid = new CheckoutCurrIntentSessionFID();
      break;

    default:
      // nothing to do
      break;
    }
    if (!fid) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME, 'We dont have the fid for name: ' + fidIDName);
    }

    // TODO: init or whatever we need
    return fid;
  }


}



