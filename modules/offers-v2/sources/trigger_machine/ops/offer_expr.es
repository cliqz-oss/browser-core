import Expression from '../expression';
import logger from '../../common/offers_v2_logger';

/**
 * Will set the current offers status we currently have on the backend.
 * @param  {object} containing the list of offers and their status as follow:
 * <pre>
 * {
 *   offer_id_1: X,
 *   offer_id_2: Y,
 *   ...
 * }
 * </pre>
 *
 * Where X | Y can be: {'active', 'inactive'}.
 * For all the offers that are not present / obsolete we can skip them directly,
 * since the offers-status-handler will take care of it.
 *
 * @version 4.0
 */
class SetOffersStatusExpr extends Expression {
  constructor(data) {
    super(data);
    this.statusObj = null;
    this.alreadySet = false;
  }

  isBuilt() {
    return this.statusObj !== null;
  }

  build() {
    if (!this.data || !this.data.raw_op.args) {
      // nothing to do
      return;
    }
    if (this.data.raw_op.args.length < 1
        || (typeof this.data.raw_op.args[0] !== 'object')) {
      throw new Error('SetOffersStatusExpr invalid args');
    }
    this.statusObj = this.data.raw_op.args[0];
  }

  destroy() {
  }

  getExprValue(/* ctx */) {
    if (!this.alreadySet) {
      if (logger.LOG_LEVEL === 'debug') {
        logger.debug('Setting the new offers status: ', this.statusObj);
      }
      this.data.offers_status_handler.loadStatusFromObject(this.statusObj);
      this.alreadySet = true;
    }
    return Promise.resolve(true);
  }
}

const ops = {
  $set_offers_status: SetOffersStatusExpr,
};

export default ops;
