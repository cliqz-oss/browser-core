import logger from '../common/offers_v2_logger';
import ContextExpression from './context_expr';
import ValueExpression from './value_expr';
import controlExpr from './ops/control_expr';
import displayExpr from './ops/display_expr';
import historyExpr from './ops/history_expr';
import signalExpr from './ops/signal_expr';
import triggerExpr from './ops/trigger_expr';
import offerExpr from './ops/offer_expr';


export default class ExpressionBuilder {
  /**
   * constructor
   * @param  {[type]} globalObjs [description]
   * {
   *   regex_cache: regexpCache,
   *   trigger_cache: triggerCache,
   *   trigger_machine: triggerMachine,
   *   offer_processor: offerProcessor,
   *   signals_handler: sigHandler,
   *   event_handler: evtHandlerMock,
   *   offers_db: offersDB,
   *   history_index: historyIndex,
   *   url_signal_db: urlSignalsDB,
   *   last_campaign_signal_db: lastCampaignSignalDB
   * }
   * @return {[type]}            [description]
   */
  constructor(globalObjs) {
    // this map will contain a name => Constructor type, and should respect the
    // proper format for each of the 3 cases.
    this.buildMap = {
      value: {},
      context: {},
      ops: {}
    };
    // we store all the global objects here
    this.globObjs = globalObjs;

    // we will register here the basic ops
    [controlExpr,
      displayExpr,
      historyExpr,
      signalExpr,
      triggerExpr,
      offerExpr
    ].forEach((opsBuilders) => {
      Object.keys(opsBuilders).forEach((exprName) => {
        this.buildMap.ops[exprName] = opsBuilders[exprName];
        this.registerOpsBuilder(exprName, opsBuilders[exprName]);
      });
    });
  }

  destroy() {
    // nothing to do
  }

  registerOpsBuilder(name, b) {
    this.buildMap.ops[name] = b;
  }

  /**
   * this will create an expression but will not build it. it will just construct
   * it.
   * The caller is responsible for building it later
   * @param  {[type]} e the expression object
   * @return {[type]}   the proper Expression class or null on error
   */
  createExp(e, parentTrigger) {
    // we have 3 cases or types of expressions:
    // - value => (string or number or boolean)
    // - context => (string starting with #)
    // - op => (string starting with $)
    //
    // the op can only be an op if it is a list
    if (e === undefined || e === null) {
      const buildData = {
        exp_builder: this,
        parent_trigger: parentTrigger
      };
      return new ValueExpression(buildData, true);
    }
    let result = null;
    if (typeof e === 'object') {
      // it is a list
      result = this._buildOpExpr(e, parentTrigger);
    } else {
      const buildData = {
        exp_builder: this,
        parent_trigger: parentTrigger
      };
      // it is a string or literal
      if (typeof e === 'string') {
        if (e.length > 0 && e[0] === '#') {
          // is a context type
          result = new ContextExpression(buildData, e);
        } else {
          // is a value
          result = new ValueExpression(buildData, e);
        }
      } else {
        // is also a value different one
        result = new ValueExpression(buildData, e);
      }
    }
    if (result === null || result === undefined) {
      throw new Error(`createExp: we cannot build the operation ${e}`);
    }
    return result;
  }

  _buildOpExpr(e, parentTrigger) {
       // check if e is valid (format)
    if (!e || e.length === 0) {
      return null;
    }
    // now w
    const op = e.slice();
    const opName = op.shift();

    // check if we have the operation name
    if (!this.buildMap.ops[opName]) {
      logger.warn(`_buildOpExpr: we don't have the operation with name ${opName}`);
      return null;
    }

    let args = [];
    if (op.length > 0) {
      args = op.shift();
    }

    let ttl = 0;
    if (op.length > 0) {
      ttl = op.shift();
    }
    const buildData = {
      raw_op: {
        op_name: opName,
        args,
        ttl
      },
      parent_trigger: parentTrigger,
      exp_builder: this,
      regex_cache: this.globObjs.regex_cache,
      trigger_cache: this.globObjs.trigger_cache,
      trigger_machine: this.globObjs.trigger_machine,
      offer_processor: this.globObjs.offer_processor,
      signals_handler: this.globObjs.signals_handler,
      event_handler: this.globObjs.event_handler,
      offers_db: this.globObjs.offers_db,
      history_index: this.globObjs.history_index,
      last_campaign_signal_db: this.globObjs.last_campaign_signal_db,
      url_signal_db: this.globObjs.url_signal_db,
      trigger_machine_executor: this.globObjs.trigger_machine_executor,
      query_handler: this.globObjs.query_handler,
      expression_cache: this.globObjs.expression_cache,
      feature_handler: this.globObjs.feature_handler,
      pattern_matching_handler: this.globObjs.pattern_matching_handler,
      offers_status_handler: this.globObjs.offers_status_handler,
    };
    const Builder = this.buildMap.ops[opName];
    return new Builder(buildData);
  }
}
