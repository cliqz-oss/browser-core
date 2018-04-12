/**
 * We will define the interface that an expression should have here
 */
import { hashString } from '../utils';
import logger from '../common/offers_v2_logger';


export default class Expression {
  /**
   * construct the expression
   * @param  {Object} data object containing:
   * <pre>
   * {
   *   raw_op: {
   *     op_name: name,
   *     args: args,
   *     ttl: ttl if exists / null otherwise,
   *
   *   },
   *   // the parent trigger of the expression
   *   parent_trigger: parentTrigger,
   *
   *   // the expression builder that we will use to build them
   *   exp_builder: expBuilder,
   *
   *   // the trigger cache
   *   trigger_cache: triggerCache,
   *   trigger_machine: triggerMachine
   *
   * }
   * </pre>
   * @return {[type]}       [description]
   */
  constructor(data) {
    // we will store this since we will use it to create the hash in case we need it
    this.data = data;
    this.hash_id = null;
  }

  getHashID() {
    if (!this.hash_id) {
      this._buildHashID();
    }
    return this.hash_id;
  }

  getOpName() {
    if (!this.data || !this.data.raw_op) {
      return '';
    }
    return this.data.raw_op.op_name;
  }

  getTTL() {
    if (!this.data || !this.data.raw_op) {
      return null;
    }
    return this.data.raw_op.ttl;
  }

  /**
   * will evaluate the expression and return the promise value
   * @param  {[type]} ctx [description]
   * @return {[type]}     [description]
   */
  evalExpr(ctx) {
    if (!this.isBuilt()) {
      try {
        this.build();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    // check if we have to check the cache or not
    const ttl = this.getTTL();
    if (ttl) {
      const hashID = this.getHashID();
      // check on the cache
      if (this.data.expression_cache.hasEntry(hashID)) {
        return Promise.resolve(this.data.expression_cache.getEntry(hashID));
      }

      // we don't have cache so evaluate, store and return
      return this.getExprValue(ctx).then((result) => {
        this.data.expression_cache.addEntry(hashID, ttl, result);
        return Promise.resolve(result);
      });
    }
    // we dont have any ttl so no need to check nor store the cache
    return this.getExprValue(ctx);
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                        API TO IMPLEMENT
  // ///////////////////////////////////////////////////////////////////////////

  /**
   * return true if was built or false other wise
   * @return {Boolean} [description]
   */
  isBuilt() {
    throw new Error('isBuilt: this should be implemented on the inherited classes');
  }

  /**
   * will build the expression
   * @return {[type]} [description]
   */
  build() {
    throw new Error('build: this should be implemented on the inherited classes');
  }

  /**
   * will clean up if needed
   * @return {[type]} [description]
   */
  destroy() {
    // nothing to do here
  }

  /**
   * will evaluate the expression, this should be implemented by inherited classes
   * We assume here that the expression was already built
   * @param  {[type]} ctx [description]
   * @return {Promise}    should return a promise.
   */
  getExprValue(/* ctx */) {
    throw new Error('getExprValue: this should be implemented on the inherited classes');
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                        PRIVATE METHODS
  // ///////////////////////////////////////////////////////////////////////////

  _buildHashID() {
    if (this.hash_id || !this.data || !this.data.raw_op) {
      return;
    }
    try {
      this.hash_id = hashString(JSON.stringify(this.data.raw_op));
    } catch (err) {
      // error
      logger.error(`Error building the hash: ${err}`);
      logger.error(`Error building the hash for trigger id: ${this.data.parent_trigger.trigger_id}`);
      this.hash_id = null;
    }
  }
}
