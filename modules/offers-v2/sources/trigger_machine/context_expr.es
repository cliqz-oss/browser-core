import Expression from './expression';

export default class ContextExpression extends Expression {
  constructor(data, ctxName) {
    super(data);
    this.ctxName = ctxName;
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                        API TO IMPLEMENT
  // ///////////////////////////////////////////////////////////////////////////

  /**
   * return true if was built or false other wise
   * @return {Boolean} [description]
   */
  isBuilt() {
    return true;
  }

  /**
   * will build the expression
   * @return {[type]} [description]
   */
  build() {
    // nothing to do
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
   * @param  {[type]} ctx [description]
   * @return {Promise}    should return a promise.
   */
  getExprValue(ctx) {
    return Promise.resolve(ctx[this.ctxName]);
  }
}
