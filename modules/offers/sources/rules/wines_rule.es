import { Rule } from 'offers/rules/rule';
import LoggingHandler from 'offers/logging_handler';



const MODULE_NAME = 'wines_rule';



////////////////////////////////////////////////////////////////////////////////
// define local FIDS ids for the internal map
//


////////////////////////////////////////////////////////////////////////////////
// Generic WinesRule class
export class WinesRule extends Rule {
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
      FID_numEventsCurrSession_lb3_upInf : {
        name : 'numEventsCurrSession',
        args : {'lowerBound' : 3, 'upperBound': 9999} // infinite
      },
      FID_offerShownCurrentSession : {
        name : 'offerShownCurrentSession',
        args : {}
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
                        '\n - fidsValuesMapping.FID_numEventsCurrSession_lb3_upInf: ' +
                        fidsValuesMapping.FID_numEventsCurrSession_lb3_upInf +
                        '\n - fidsValuesMapping.FID_offerShownCurrentSession: ' +
                        fidsValuesMapping.FID_offerShownCurrentSession);

    // check if we already show the offer in the current session
    if (fidsValuesMapping.FID_offerShownCurrentSession > 0.0) {
      return 0.0;
    }

    // check if we are in the first events
    if (fidsValuesMapping.FID_numEventsCurrSession_lb3_upInf > 0.0) {
      // then we don't have to show anything here
      return 1.0;
    }

    return 0.0;
  }

}
