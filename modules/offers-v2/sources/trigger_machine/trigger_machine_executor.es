
// NOTES
// - dependent triggers are only requestsed only when ALL previous dep triggers expire
import MessageQueue from '../../core/message-queue';
import logger from '../common/offers_v2_logger';
import TriggerMachine from './trigger_machine';
import OffersConfigs from '../offers_configs';
import PersistentCacheDB from '../persistent_cache_db';

export default class TriggerMachineExecutor {

  constructor(globObjs) {
    this.globObjs = globObjs;
    this.globObjs.trigger_machine_executor = this;
    // the list events we need to process.
    this._processEvent = this._processEvent.bind(this);
    this.evtQueue = new MessageQueue('trigger-machine-queue', this._processEvent);

    // here we need to create 2 new databases for the send_signal operation,
    // this is very nasty and we should move it away after the refactorization
    // for performance (put them on the send_signal operation object itself)
    const urlDBconfigs = {
      should_persist: OffersConfigs.SEND_SIG_OP_SHOULD_LOAD,
      autosave_freq_secs: OffersConfigs.SEND_SIG_OP_AUTOSAVE_FREQ_SECS,
      old_entries_dt_secs: OffersConfigs.SEND_SIG_OP_EXPIRATION_SECS
    };
    // we will store here:
    // {
    //  url: {
    //    counter: N
    //  }
    // }
    // since we can get the last_update value from the container
    const urlSignalsDB = new PersistentCacheDB(this.globObjs.db, 'offers-signals-url', urlDBconfigs);
    urlSignalsDB.loadEntries();
    this.globObjs.url_signal_db = urlSignalsDB;

    // we will store here the latest conversion that happened for a campaign id:
    // {
    //  cid: {
    //    sig_name: {
    //      counter: N,
    //      l_u_ts: last timestamp happened.
    //    }
    //  }
    // }
    const lastCampaignSignalDB = new PersistentCacheDB(this.globObjs.db, 'offers-last-cmp-signals', urlDBconfigs);
    lastCampaignSignalDB.loadEntries();
    this.globObjs.last_campaign_signal_db = lastCampaignSignalDB;

    // the trigger machine
    this.triggerMachine = new TriggerMachine(this.globObjs);

    // callback
    this.processWatchReqCallback = this.processWatchReqCallback.bind(this);
  }

  destroy() {
    if (this.globObjs.url_signal_db) {
      this.globObjs.url_signal_db.saveEntries();
      this.globObjs.url_signal_db.destroy();
      this.globObjs.url_signal_db = null;
    }
    if (this.globObjs.last_campaign_signal_db) {
      this.globObjs.last_campaign_signal_db.saveEntries();
      this.globObjs.last_campaign_signal_db.destroy();
      this.globObjs.last_campaign_signal_db = null;
    }
  }

  /**
   * this method should be called everytime there is a url change
   * @param  {[type]} data contains the url and url object information.
   * @return {[type]}      [description]
   */
  processUrlChange(data, evtType = 'url') {
    this.evtQueue.push({ evt_type: evtType, evt_data: data });
  }

  /**
   * this method will be used to subscribe a new domain to watch a request
   * @param  {[type]} data [description]
   * @return {[type]}      [description]
   */
  processWatchReqCallback(data, cbArgs) {
    if (!data ||
        !data.reqObj ||
        !data.reqObj.url ||
        !cbArgs ||
        !cbArgs.trigger_id) {
      // invalid call?
      logger.warn('processWatchReqCallback: invalid args');
      return;
    }

    const lwUrl = data.reqObj.url.toLowerCase();

    // we check here if the trigger still exists
    const trigger = this.triggerMachine.getTriggerByID(cbArgs.trigger_id);
    if (!trigger) {
      return;
    }
    const d = {
      url: data.reqObj.url,
      urlObj: data.urlObj,
      trigger_id: cbArgs.trigger_id,
      lowerCaseUrl: lwUrl
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
    try {
      // we process the event now
      const ctx = {
        '#url': data.url,
        '#lc_url': data.lowerCaseUrl
      };
      if (data.urlObj) {
        ctx['#domain'] = data.urlObj.domain;
        ctx['#url_data'] = this.globObjs.regex_helper.buildUrlMatchData({
          url: data.url,
          domain: data.urlObj.domain
        });

        // adding the referrer as context information
        ctx['#referrer'] = data.urlObj.referrer;
      }

      // add the query handler info
      ctx['#query_info'] = data.queryInfo;

      let trigger = null;
      if (data.trigger_id) {
        trigger = this.triggerMachine.getTriggerByID(data.trigger_id);
      }
      logger.info(`processing new event for url: ${data.url}`);
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
