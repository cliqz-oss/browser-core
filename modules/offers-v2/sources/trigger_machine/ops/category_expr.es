import Expression from '../expression';
import logger from '../../common/offers_v2_logger';

/**
 * This operation will be used to check if a category is active or not given
 * the name of the category.
 * This operation will return true if the category is active or false otherwise
 * @param {object} args
 * <pre>
 * {
 *   catName: 'category_name'
 * }
 * </pre>
 * @version 5.0
 */
class IsCategoryActiveExpr extends Expression {
  constructor(data) {
    super(data);
    this.args = null;
  }

  isBuilt() {
    return this.args !== null;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length < 1) {
      throw new Error('IsCategoryActiveExpr invalid args');
    }
    // we check that we have the proper arguments
    const args = this.data.raw_op.args[0];
    if (!args || !args.catName) {
      throw new Error('IsCategoryActiveExpr invalid args, missing catName?');
    }
    this.args = args;
  }

  destroy() {
  }

  getExprValue() {
    try {
      return Promise.resolve(this.data.category_handler.isCategoryActive(this.args.catName));
    } catch (e) {
      logger.error('IsCategoryActiveExpr Error:', e);
      return Promise.reject(e);
    }
  }
}

const ops = {
  $is_category_active: IsCategoryActiveExpr,
};

export default ops;
