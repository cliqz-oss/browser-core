/*
 * This module will contain all the methods and logic we need to filter out
 * offers for the soft filters.
 * This filter will check for conditions that are more probably
 * to change on the near future, like, if the offer was recently shown or closed
 * or any offer of the same type was shown, etc.
 * In this category we use what was previously used, using jsep as language
 * for building rules.
 *
 *
 * Please read before the following documentation to have an idea of what this
 * module is intended for
 *
 * https://cliqztix.atlassian.net/wiki/spaces/SBI/pages/90153442/Filtering+Rules
 *
 */

import logger from '../common/offers_v2_logger';
import { timestampMS } from '../utils';

// /////////////////////////////////////////////////////////////////////////////
//                        GENERIC METHODS
// /////////////////////////////////////////////////////////////////////////////

// Operators
const gtOrEqTo = (leftArg, rightArg) => leftArg >= rightArg;
const lsOrEqTo = (leftArg, rightArg) => leftArg <= rightArg;
const eqTo = (leftArg, rightArg) => leftArg === rightArg;
const notEqTo = (leftArg, rightArg) => leftArg !== rightArg;

const OPERATIONS_MAP = {
  '>=': gtOrEqTo,
  '<=': lsOrEqTo,
  '==': eqTo,
  '!=': notEqTo,
};


/**
 * Compares a given offer attribute to an input number
 * @param  {[type]} offerDisplayID  the offer display id we want to check
 * @param  {Object} args  contains the following 4 elements
 * * @param {string} actionID offer's action involved
 * * @param {string} attType attribute to be evaluated (counter, c_ts, l_u_ts)
 * * @param {string} operator one of these: '>=', '<=', '==', '!='
 * * @param {integer} value numerical value to be compared to
 * @param {object} offersDB the needed offer database
 * @return {boolean} true on success (show it) | false otherwise
 * @version 1.0
 */
const genericComparator = (displayID, { actionID, attType, operator, value }, offersDB) => {
  const operation = OPERATIONS_MAP[operator];
  if (!operation) {
    logger.warn(`_genericComparator: This operation wasn't found ${operator}`);
    return false;
  }
  const offerAction = offersDB.getOfferDisplayActionMeta(displayID, actionID);
  if (!offerAction) {
    return true;
  }
  if (attType === 'counter') {
    // compare counter of events
    return operation(offerAction.count, value);
  } else if (attType === 'c_ts' || attType === 'l_u_ts') {
    // calculate the time diff assuming attType has the right name,
    // we could make a map to do this as well
    const timeDelta = (timestampMS() - offerAction[attType]) / 1000;
    return operation(timeDelta, value);
  }
  logger.warn(`_genericComparator: unknown attribute '${attType}'`);
  return false;
};

/**
 * Compares a given offer attribute to an input number
 */
const currentOfferGenericComparator = (offer, eArgs, offersDB) => {
  if (eArgs.length < 4) {
    logger.warn(`_currentOfferGenericComparator: not enough arguments (${eArgs.length})`);
    return false;
  }
  const args = {
    actionID: eArgs[0].value,
    attType: eArgs[1].value,
    operator: eArgs[2].value,
    value: eArgs[3].value,
  };
  return genericComparator(offer.displayID, args, offersDB);
};

/**
 * This method will provide a common function to be able to count number of offers
 * we have for a given property (over the counterFun argument)
 */
const genericCounterComparator = (offer, eArgs, counterFun) => {
  if (eArgs.length < 2) {
    logger.warn(`genericCounterComparator: not enough arguments (${eArgs.length})`);
    return false;
  }
  const operator = eArgs[0].value;
  const operation = OPERATIONS_MAP[operator];
  if (!operation) {
    logger.warn(`genericCounterComparator: This operation wasn't found ${operator}`);
    return false;
  }
  const value = eArgs[1].value;
  // get the count of offers for the given client
  const genCounter = counterFun(offer);
  return operation(genCounter, value);
};

const countClientOffers = (offer, eArgs, offersDB) =>
  genericCounterComparator(offer, eArgs, (o) => {
    const clientOffers = offersDB.getClientOffers(o.clientID);
    return (clientOffers === null) ? 0 : clientOffers.size;
  });

const countCampaignOffers = (offer, eArgs, offersDB) =>
  genericCounterComparator(offer, eArgs, (o) => {
    const campaignOffers = offersDB.getCampaignOffers(o.campaignID);
    return (campaignOffers === null) ? 0 : campaignOffers.size;
  });

const FILTER_EVAL_FUN_MAP = {
  generic_comparator: currentOfferGenericComparator,
  count_client_offers: countClientOffers,
  count_campaign_offers: countCampaignOffers,
};

/**
 * This method will evaluate a jsep expression as described on the documentation [1]
 * and will return true if the expression was evaluated and all the rules apply,
 * or false if fail or any of the rules (expressions) returns false
 *
 * [1] - https://cliqztix.atlassian.net/wiki/spaces/SBI/pages/90153442/Filtering+Rules
 */
const evalExpression = (offer, expr, offersDB) => {
  if (expr.type === 'CallExpression') {
    // check if we have the function name
    const callee = expr.callee.name;
    if (!FILTER_EVAL_FUN_MAP[callee]) {
      logger.warn(`_evalExpression: filter function ${callee} doesn't exist`);
      return false;
    }
    return FILTER_EVAL_FUN_MAP[callee](offer, expr.arguments, offersDB);
  } else if (expr.type === 'LogicalExpression' && expr.operator === '||') {
    return (evalExpression(offer, expr.left, offersDB) ||
            evalExpression(offer, expr.right, offersDB));
  } else if (expr.type === 'LogicalExpression' && expr.operator === '&&') {
    return (evalExpression(offer, expr.left, offersDB) &&
            evalExpression(offer, expr.right, offersDB));
  }
  return false;
};

// /////////////////////////////////////////////////////////////////////////////
//                        Filter methods
// /////////////////////////////////////////////////////////////////////////////


/**
 * This method will basically discard / select the offers that can be potentially
 * shown to the user. We here will discard offers that for example where recently
 * shown, used, etc. This is a "softer" filter since it may happen that after a while
 * some of the offer are "selectable" to be shown again.
 * TODO: add documentation link here.
 * @param {object} context The data / object we need to be able to perform the
 *                         filtering on the offers.
 * {
 *   offersDB: object,
 * }
 * @returns true if we should filter the offer | false otherwise
 */
export default function shouldFilterOffer(offer, offersDB) {
  if (!offer) {
    logger.warn('shouldFilterOffer: undefined offer');
    return true;
  }

  // check if we have filtering rules
  if (!offer.hasFilterRules()) {
    // no rules => we should show it
    return false;
  }

  // we now evaluate the expression
  let shouldWeShowOffer = false;
  try {
    shouldWeShowOffer = evalExpression(offer, offer.filterRules, offersDB);
  } catch (e) {
    logger.error(`expr failed: ${JSON.stringify(offer.filterRules)}`, e);
  }

  return !shouldWeShowOffer;
}

