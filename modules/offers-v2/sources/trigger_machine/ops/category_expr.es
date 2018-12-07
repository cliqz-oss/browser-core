import Expression from '../expression';
import logger from '../../common/offers_v2_logger';
import Category from '../../categories/category';

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

/**
 * This operation will add new categories to be observe on the client. It will
 * also update old ones if they are newer (the version of the category is higher).
 * @param {object} args
 * <pre>
 * {
 *   toUpdate: [
 *     categoryObj1,
 *     categoryObj2,
 *     ...
 *   ]
 * }
 * </pre>
 */
class AddCategoriesExpr extends Expression {
  constructor(data) {
    super(data);
    this.args = null;
    this.executed = false;
  }

  isBuilt() {
    return this.args !== null;
  }

  build() {
    if (!this.data.raw_op.args || this.data.raw_op.args.length < 1) {
      throw new Error('AddCategoriesExpr invalid args');
    }
    // we check that we have the proper arguments
    const args = this.data.raw_op.args[0];
    if (!args || !args.toUpdate) {
      throw new Error('AddCategoriesExpr invalid args, missing catName?');
    }
    this.args = args;
  }

  destroy() {
  }

  getExprValue() {
    if (this.executed) {
      return Promise.resolve(true);
    }
    try {
      this.args.toUpdate.forEach((catObj) => {
        const category = this._buildCategoryFromObj(catObj);
        if (category) {
          this.data.category_handler.addCategory(category);
        }
      });

      // build the handler again
      this.data.category_handler.build();

      this.executed = true;
      return Promise.resolve(true);
    } catch (e) {
      logger.error('IsCategoryActiveExpr Error:', e);
      return Promise.reject(e);
    }
  }

  _buildCategoryFromObj(catObj) {
    if (!catObj
        || !catObj.name
        || !catObj.patterns
        || !catObj.version
        || !catObj.timeRangeSecs
        || !catObj.activationData) {
      logger.warn('invalid category object: ', catObj);
      return null;
    }
    return new Category(
      catObj.name,
      catObj.patterns,
      catObj.version,
      catObj.timeRangeSecs,
      catObj.activationData
    );
  }
}


const ops = {
  $is_category_active: IsCategoryActiveExpr,
  $add_categories: AddCategoriesExpr,
};

export default ops;
