
// NOTES
// - dependent triggers are only requestsed only when ALL previous dep triggers expire

import TriggerCache from './trigger_cache';
import RegexpCache from './regexp_cache';
import OperationExecutor from './operation_executor';
import TriggerMachine from './trigger_machine';
import HistoryIndex from './history_index';
import RegexpHelper from './regex_helper';
import PersistentCacheDB from './persistent_cache_db';
import OffersConfigs from './offers_configs';


export default class EventLoop {

  constructor(environment, db) {
    var self = this;

    // initialize
    self.environment = environment;
    self.triggerCache = new TriggerCache(this);
    self.regexpCache = new RegexpCache(this);
    self.operationExecutor = new OperationExecutor(this);
    self.triggerMachine = new TriggerMachine(this);
    self.historyIndex = new HistoryIndex(this);
    self.regexHelper = new RegexpHelper();

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
    self.urlSignalsDB = new PersistentCacheDB(db, 'offers-signals-url', urlDBconfigs);
    self.urlSignalsDB.loadEntries();

    // we will store here the latest conversion that happened for a campaign id:
    // {
    //  cid: {
    //    sig_name: {
    //      counter: N,
    //      l_u_ts: last timestamp happened.
    //    }
    //  }
    // }
    self.lastCampaignSignalDB = new PersistentCacheDB(db, 'offers-last-cmp-signals', urlDBconfigs);
    self.lastCampaignSignalDB.loadEntries();

    self.environment.onUrlChange((url, urlObj) => {
      if(!url) {
        return;
      }

      var context = {
        '#url': url
      };

      if(urlObj && urlObj['domain']) {
        context['#domain'] = urlObj['domain'];
        // parse url data for faster pattern matching
        context['#url_data'] = self.regexHelper.buildUrlMatchData({
          url,
          domain: urlObj.domain
        });

        // adding the referrer as context information
        context['#referrer'] = urlObj.referrer;
      }


      self.triggerMachine.runRoot(context).then(result => {
        self.environment.info("EventLoop", `Executed triggers for url: ${context['#url']}`);
      }).catch(err => {
        self.environment.error("EventLoop", err);
      });
    });
  }

  destroy() {
    if (this.urlSignalsDB) {
      this.urlSignalsDB.saveEntries();
      this.urlSignalsDB.destroy();
    }
    if (this.lastCampaignSignalDB) {
      this.lastCampaignSignalDB.saveEntries();
      this.lastCampaignSignalDB.destroy();
    }
  }

}
