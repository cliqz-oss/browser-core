import LoggingHandler from 'offers/logging_handler';
// rules
import { Rule } from 'offers/rules/rule';
import { FoodDeliveryRule } from 'offers/rules/food_delivery_rule';
import { TravelRule } from 'offers/rules/travel_rule';
import { GamingRule } from 'offers/rules/gaming_rule';


const MODULE_NAME = 'rules_builder';


////////////////////////////////////////////////////////////////////////////////
export class RulesBuilder {
  constructor() {
  }

  //
  // @brief Build a new rule for the given cluster ID
  // @return a new instance of that rule type || null on error
  //
  buildRule(clusterID) {
    let cidNum = Number(clusterID);
    var rule = null;
    switch (cidNum) {
      // toner
      case 0: break;
      // travel
      case 1:
        rule = new TravelRule();
      break;
      // car parts
      case 2: break;
      // online tickets
      case 3: break;
      // food delivery
      case 4:
        rule = new FoodDeliveryRule();
        break;
      case 5:
        rule = new GamingRule();
        break;

      default:
    }
    if (!rule) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME, 'We dont have the rule for clusterid: ' + cidNum);
    } else {
      rule.setClusterID(clusterID);
    }

    return rule;
  }


}



