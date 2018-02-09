import Expression from '../expression';
import { timestampMS, getABNumber } from '../../utils';

/**
 * This operation will make an offer "active" into the system, basically, this will
 * call the offer processor module which is responsible to filter + show offers.
 * If the offer is not active it will be shown in the given real states.
 * @param  {string} url   the current url
 * @param  {object} offer  is the offer object itself
 * @return {Promise(Boolean)} true if display the offer, otherwise false
 * @version 1.0
 */
class ShowOfferExpr extends Expression {
  constructor(data) {
    super(data);
    this.urlData = null;
    this.offerInfo = null;
  }

  isBuilt() {
    return this.urlData && this.offerInfo;
  }

  build() {
    if (!this.data || !this.data.raw_op.args) {
      // nothing to do
      return;
    }
    if (this.data.raw_op.args.length < 2) {
      throw new Error('ShowOfferExpr invalid args');
    }
    this.urlData = this.data.exp_builder.createExp(this.data.raw_op.args[0],
                                                   this.data.parent_trigger);
    this.offerInfo = this.data.raw_op.args[1];
  }

  destroy() {
  }

  getExprValue(ctx) {
    return this.urlData.evalExpr(ctx).then((urlVal) => {
      this.offerInfo.rule_info.type = 'exact_match';
      this.offerInfo.rule_info.url = [urlVal];
      const result = this.data.offer_processor.pushOffer(this.offerInfo, this.offerInfo.rule_info);
      return Promise.resolve(result);
    });
  }
}

/**
 * Offer added is a method used to check if an offer was added (is active) or not
 * on the system in the last N seconds.
 * @param  {string} offerID The offer id we want to check
 * @param  {integer} secs The number of seconds
 * @return {boolean} true if the offer was "added" in the last secs seconds or false
 *                   otherwise
 * @version 1.0
 */
class OfferAddedExpr extends Expression {
  constructor(data) {
    super(data);
    this.offerID = null;
    this.seconds = null;
  }

  isBuilt() {
    return this.offerID && this.seconds;
  }

  build() {
    if (!this.data || !this.data.raw_op.args) {
      // nothing to do
      return;
    }
    if (this.data.raw_op.args.length < 2) {
      throw new Error('OfferAddedExpr invalid args');
    }
    this.offerID = this.data.raw_op.args[0];
    this.seconds = this.data.raw_op.args[1];
  }

  destroy() {
  }

  getExprValue(/* ctx */) {
    // get the last offer updated time for this id
    const offerMeta = this.data.offers_db.getOfferMeta(this.offerID);
    if (!offerMeta) {
      return Promise.resolve(false);
    }
    const result = (offerMeta.l_u_ts > (timestampMS() - (this.seconds * 1000)));
    return Promise.resolve(result);
  }
}


/**
 * This function will select an offer from a list of them, using a new parameter
 * to distinguish how much probability should have to be shown.
 * This is an AB test internal method.
 * The way it works is as follow:
 * Given a unique number generated on the client side once (ABNum) and a list of
 * N offers containing a percentage number POi (percentage for offer i), assuming
 * that SUM(POi) = 1 for i: 0,..,N, we:
 *  1) Filter all the offers that doesn't contain the POi (just in case to avoid error,
 *     even when this is actually an error).
 *  2) We normalize the percentages (just in case SUM(POi) != 1), basically dividing
 *     each of the POi with the SUM(POi).
 *  3) We generate ranges of the form [..,(PO(i-1) * 10000, 10000 * POi),..] and we
 *     check in which range ABNum is in (note 10000 is the max num of the ABNum).
 *  4) After selecting that offer we show it as usual.
 * @param {string} url is the url that we want to
 * @param {list} offerList is the list of offers with their given percentage
 * @version 1.0
 */
class ShowABOfferExpr extends Expression {
  constructor(data) {
    super(data);
    this.urlData = null;
    this.offersList = null;
  }

  isBuilt() {
    return this.urlData && this.offersList;
  }

  build() {
    if (!this.data || !this.data.raw_op.args) {
      // nothing to do
      return;
    }
    if (this.data.raw_op.args.length < 2) {
      throw new Error('ShowABOfferExpr invalid args');
    }
    this.urlData = this.data.exp_builder.createExp(this.data.raw_op.args[0],
                                                   this.data.parent_trigger);
    this.offersList = this.data.raw_op.args[1];
  }

  destroy() {
  }

  getExprValue(ctx) {
    return this.urlData.evalExpr(ctx).then((urlVal) => {
      if (!this.offersList || this.offersList.length === 0) {
        return Promise.reject(new Error('invalid args, no offers list?'));
      }

      // get the percentages of possibilities of each of the offers, if some of them
      // has not then we stop here.
      const percentages = {};
      let totalPct = 0.0;
      let index = -1;

      this.offersList.forEach((offerObj) => {
        index += 1;
        if (!offerObj.ab_test_info || !offerObj.ab_test_info.pct) {
          return;
        }
        // we consider this
        const percentage = Number(offerObj.ab_test_info.pct);
        totalPct += percentage;
        percentages[index] = percentage;
      });

      if (totalPct <= 0) {
        return Promise.reject(new Error('we couldnt calculate the percentage of all the offers on the AB test group'));
      }

      // normalize just in case
      Object.keys(percentages).forEach((idx) => {
        percentages[idx] /= totalPct;
      });

      // get the number and see in which range it is
      let accumPct = 0;
      let selectedOffer = null;
      const abNum = getABNumber();
      Object.keys(percentages).forEach((idx) => {
        if (selectedOffer) {
          return;
        }
        accumPct += percentages[idx];
        const normNum = accumPct * 10000;
        if (abNum < normNum) {
          // this is the selected one
          selectedOffer = this.offersList[idx];
        }
      });

      // if there is no selected offer something very bad happened?
      if (!selectedOffer) {
        return Promise.reject(new Error('we couldnt select any offer.. this is not right'));
      }

      // continue with the normal flow
      selectedOffer.rule_info.type = 'exact_match';
      selectedOffer.rule_info.url = [urlVal];
      const result = this.data.offer_processor.pushOffer(selectedOffer, selectedOffer.rule_info);

      return Promise.resolve(result);
    });
  }
}

const ops = {
  $show_offer: ShowOfferExpr,
  $offer_added: OfferAddedExpr,
  $show_ab_offer: ShowABOfferExpr
};

export default ops;
