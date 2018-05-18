import Expression from '../expression';
import Intent from '../../intent/intent';


/**
 * This method will trigger a new intent on the system.
 * @param {object} intentData will contain the following information:
 * <pre>
 * {
 *   name: the intent name here (to be used as id to fetch associated offers later),
 *   durationSecs: N, // for how long the intent will be active after it is triggered
 * }
 * </pre>
 *
 * @return void
 * @version 20.0
 */
class ActivateIntentExpr extends Expression {
  constructor(data) {
    super(data);
    this.args = null;
  }

  isBuilt() {
    return this.args !== null;
  }

  build() {
    if (!this.data || !this.data.raw_op.args) {
      // nothing to do
      return;
    }
    if (this.data.raw_op.args.length < 1) {
      throw new Error('ActivateIntentExpr invalid args');
    }
    const args = this.data.raw_op.args[0];
    if (!args.name || (!args.durationSecs || args.durationSecs <= 0)) {
      throw new Error('ActivateIntentExpr no name or durationSecs found?');
    }
    this.args = args;
  }

  destroy() {
  }

  getExprValue() {
    if (!this.data.intent_handler.isIntentActiveByName(this.args.name)) {
      // activate here
      const intent = new Intent(this.args.name, this.args.durationSecs);
      this.data.intent_handler.activateIntent(intent);
    }
    return Promise.resolve();
  }
}


const ops = {
  $activate_intent: ActivateIntentExpr
};

export default ops;
