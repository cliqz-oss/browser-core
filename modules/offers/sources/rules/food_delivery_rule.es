import { Rule } from 'offers/rules/rule';
import LoggingHandler from 'offers/logging_handler';



const MODULE_NAME = 'food_delivery_rule';



////////////////////////////////////////////////////////////////////////////////
// define local FIDS ids for the internal map
//


////////////////////////////////////////////////////////////////////////////////
// Generic FoodDeliveryRule class
export class FoodDeliveryRule extends Rule {
  constructor() {
    super();
  }

  //////////////////////////////////////////////////////////////////////////////
  //                        API TO IMPLEMENT
  //////////////////////////////////////////////////////////////////////////////

  //
  // @brief this function should return a map with the following data:
  //  {
  //    id1: {name: 'fid_name', args: {arg_name1: arg_value1, ...}},
  //  }
  //
  // note that we could have repeated fid_names if and only if they differ
  // in the arg_values for the same arg_name. If not this will be less performant
  // (in the future we can automatically check this.)
  //
  fidsMappings() {
    // we want to show after the 3th event:
    // so to be more robust we will do the following
    //
    return {
      FID_numEventsCurrSession_N5_delta2 : {
        name : 'numEventsCurrSession',
        args : {'N' : 5, 'delta': 2}
      },
      FID_offerShownCurrentSession : {
        name : 'offerShownCurrentSession',
        args : {}
      },
      FID_checkoutCurrIntentSession : {
        name : 'checkoutCurrIntentSession',
        args : {}
      },
      FID_hour_range_18_20 : {
        name : 'hour',
        args: {'range': [18,19,20]}
      },
      FID_day_range_5_6 : {
        name : 'day',
        args: {'range': [5,6]}
      }
    };
  }

  //
  // @brief this method is the one that should contain the rule logic to be
  //        evaulated.
  // @param fidsValuesMapping is the argument containing the following data
  //        structure:
  //  {
  //    id1: value,
  //  }
  // where id1 is the same id provided in get fidsMappings() function and
  //       value is the resulting value from the evaluated fid with the given
  //             arguments.
  //
  // @return a value between [0,1] as intent value.
  //
  evaluate(fidsValuesMapping) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                        'FidsValues: ' +
                        '\n - fidsValuesMapping.FID_numEventsCurrSession_N5_delta2: ' +
                        fidsValuesMapping.FID_numEventsCurrSession_N5_delta2 +
                        '\n - fidsValuesMapping.FID_hour_range_18_20: ' +
                         fidsValuesMapping.FID_hour_range_18_20 +
                         '\n - fidsValuesMapping.FID_day_range_5_6: ' +
                         fidsValuesMapping.FID_day_range_5_6 +
                         '\n - fidsValuesMapping.FID_offerShownCurrentSession:  ' +
                         fidsValuesMapping.FID_offerShownCurrentSession +
                         '\n - fidsValuesMapping.FID_checkoutCurrIntentSession: ' +
                         fidsValuesMapping.FID_checkoutCurrIntentSession);

    // rule is:
    // - after third event on the first session
    // - or friday | sat , between 6-8pm => first event.

    // check if we are in the first events
    if ((fidsValuesMapping.FID_offerShownCurrentSession > 0.0) ||
        (fidsValuesMapping.FID_checkoutCurrIntentSession > 0.0)) {
      // then we don't have to show anything here
      return 0.0;
    }

    // now check if the we are in one of the good day / timing
    if ((fidsValuesMapping.FID_hour_range_18_20 > 0.0) &&
        (fidsValuesMapping.FID_day_range_5_6 > 0.0)) {
      return 1.0;
    }

    // else we need to check if we have 3 events
    return (fidsValuesMapping.FID_numEventsCurrSession_N5_delta2 > 0.0) ? 1.0 : 0.0;
  }

}
