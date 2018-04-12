
// NOTES
// - dependent triggers are only requestsed only when ALL previous dep triggers expire
import MessageQueue from '../../core/message-queue';
import logger from '../common/offers_v2_logger';
import TriggerMachine from './trigger_machine';

export default class TriggerMachineExecutor {
  constructor(globObjs) {
    this.globObjs = globObjs;
    this.globObjs.trigger_machine_executor = this;
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
   * @param  {[type]} data contains the url and url object information.
   * @return {[type]}      [description]
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
    if (!data ||
        !data.url_data ||
        !cbArgs ||
        !cbArgs.trigger_id) {
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

  _processEvent(evtData) {
    if (!evtData || !evtData.evt_data) {
      return Promise.resolve(false);
    }
    const data = evtData.evt_data;
    // increment the current running pass
    this.runCount += 1;
    try {
      // we process the event now
      const ctx = {
        '#url': data.url_data.getRawUrl(),
        '#lc_url': data.url_data.getLowercaseUrl(),
        '#domain': data.url_data.getDomain(),
        '#url_data': data.url_data,
        // adding the referrer as context information
        '#referrer': data.url_data.getReferrerName(),
        '#currentPass': this.runCount,
      };

      let trigger = null;
      if (data.trigger_id) {
        trigger = this.triggerMachine.getTriggerByID(data.trigger_id);
      }
      logger.info(`processing new event for url: ${data.url_data.getRawUrl()}`);
      if (trigger) {
        return this.triggerMachine.run(trigger, ctx);
      }
      return this.triggerMachine.runRoot(ctx);
    } catch (err) {
      logger.error(`_processEvents: something wrong happened: ${err}`);
    }
    return Promise.resolve(false);
  }
}
