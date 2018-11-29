
// NOTES
// - dependent triggers are only requestsed only when ALL previous dep triggers expire
import MessageQueue from '../../core/message-queue';
import prefs from '../../core/prefs';
import logger from '../common/offers_v2_logger';
import { timestampMS } from '../utils';
import TriggerMachine from './trigger_machine';

/**
 * @class TriggerMachineExecutor
 */
export default class TriggerMachineExecutor {
  constructor(globObjs) {
    this.globObjs = globObjs;
    this.globObjs.trigger_machine_executor = this;

    this.telemetry = globObjs.telemetry;
    if (!prefs.get('offersTriggerTelemetryPerformance', true)) {
      this.telemetry = null;
    }

    // the list events we need to process.
    this._processEvent = this._processEvent.bind(this);
    this.evtQueue = new MessageQueue('trigger-machine-queue', this._processEvent);

    // the trigger machine
    this.triggerMachine = new TriggerMachine(this.globObjs);

    // callback
    this.processWatchReqCallback = this.processWatchReqCallback.bind(this);

    // this run ID will be used to know if any of the triggers was already
    // executed on a given pass or not
    this.runCount = 0;
  }

  destroy() {
  }

  /**
   * this method should be called everytime there is a url change
   *
   * @method processUrlChange
   * @param  {UrlData} data.url_data
   */
  processUrlChange(data, evtType = 'url') {
    return this.evtQueue.push({ evt_type: evtType, evt_data: data });
  }

  /**
   * this method will be used to subscribe a new domain to watch a request
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  processWatchReqCallback(data, cbArgs) {
    if (!data
        || !data.url_data
        || !cbArgs
        || !cbArgs.trigger_id) {
      // invalid call?
      logger.warn('processWatchReqCallback: invalid args');
      return;
    }
    // we check here if the trigger still exists
    const trigger = this.triggerMachine.getTriggerByID(cbArgs.trigger_id);
    if (!trigger) {
      return;
    }
    const d = {
      trigger_id: cbArgs.trigger_id,
      url_data: data.url_data
    };
    this.processUrlChange(d, 'req');
  }

  // ///////////////////////////////////////////////////////////////////////////
  // Private methods
  // ///////////////////////////////////////////////////////////////////////////
  //

  /**
   * Qmethod _processEvent
   * @param {UrlData} evt_data.url_data
   * @returns {Promise<boolean>}
   * @private
   */
  async _processEvent(evtData) {
    if (!evtData || !evtData.evt_data) {
      return false;
    }
    const data = evtData.evt_data;
    // increment the current running pass
    this.runCount += 1;
    try {
      // we process the event now
      const ctx = {
        '#url': data.url_data.getRawUrl(),
        '#domain': data.url_data.getDomain(),
        '#url_data': data.url_data,
        // adding the referrer as context information
        '#referrer': data.url_data.getReferrerName(),
        '#currentPass': this.runCount,
        '#httpLoadMs': 0,
      };

      let trigger = null;
      if (data.trigger_id) {
        trigger = this.triggerMachine.getTriggerByID(data.trigger_id);
      }

      //
      // Auxiliary functions for performance measurement.
      // Creates a side promise branch with its own catch.
      //
      const wrapPerformance = (step) => {
        const startMs = timestampMS();
        const telemetryPush = () => {
          const processMs = timestampMS() - startMs - (ctx['#httpLoadMs'] || 0);
          return this.telemetry.push(
            { action: 'offers-v2.trigger.process', ms: processMs },
            'metrics.performance.general'
          );
        };
        if (this.telemetry) {
          step.then(telemetryPush, telemetryPush)
            .catch(err => logger.warn('wrapPerformance failed:', err));
        }
        return step;
      };

      //
      // Execute the triggers
      //
      if (trigger) {
        await wrapPerformance(this.triggerMachine.run(trigger, ctx));
      } else {
        await wrapPerformance(this.triggerMachine.runRoot(ctx));
      }
      return true;
      //
    } catch (err) {
      logger.error(`_processEvents: something wrong happened: ${err}`);
    }
    return false;
  }
}
