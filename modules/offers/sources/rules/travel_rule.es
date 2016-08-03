import { Rule } from 'offers/rules/rule';
import LoggingHandler from 'offers/logging_handler';



const MODULE_NAME = 'travel_rule';



////////////////////////////////////////////////////////////////////////////////
// define local FIDS ids for the internal map
//


////////////////////////////////////////////////////////////////////////////////
// Generic TravelRule class
export class TravelRule extends Rule {
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
    return {
      FID_numEventsCurrSession_N7_delta2 : {
        name : 'numEventsCurrSession',
        args : {'N' : 7, 'delta' : 2}
      },
      FID_offerShownCurrentSession : {
        name : 'offerShownCurrentSession',
        args : {}
      },
      FID_checkoutCurrIntentSession : {
        name : 'checkoutCurrIntentSession',
        args : {}
      },
      FID_sessionCount_biggerThan_2: {
        name: 'sessionCount',
        args: {'biggerThan': 2}
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
    LoggingHandler.error(MODULE_NAME,
                         'FID_numEventsCurrSession_N7_delta2: ' +
                         fidsValuesMapping.FID_numEventsCurrSession_N7_delta2 +
                         '\n - FID_sessionCount_biggerThan_2: ' +
                         fidsValuesMapping.FID_sessionCount_biggerThan_2);

    // rule:
    // (second session or greater) && (5th event or greater)

    // check if we are in the first events
    if ((fidsValuesMapping.FID_offerShownCurrentSession > 0.0)  ||
        (fidsValuesMapping.FID_checkoutCurrIntentSession > 0.0)) {
      // then we don't have to show anything here
      return 0.0;
    }

    if (fidsValuesMapping.FID_numEventsCurrSession_N7_delta2 > 0.0 &&
        fidsValuesMapping.FID_sessionCount_biggerThan_2 > 0.0) {
      return 1;
    }
    return 0;
  }


}



