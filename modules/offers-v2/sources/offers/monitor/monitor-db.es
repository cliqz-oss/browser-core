import PersistentCacheDB from '../../persistent_cache_db';
import OffersConfigs from '../../offers_configs';

/**
 * This class will handle the databases needed for the monitors
 */
export default class MonitorDBHandler {
  constructor() {
    // here we need to create 2 new databases for the send_signal operation,
    // this is very nasty and we should move it away after the refactorization
    // for performance (put them on the send_signal operation object itself)
    const urlDBconfigs = {
      should_persist: OffersConfigs.SEND_SIG_OP_SHOULD_LOAD,
      old_entries_dt_secs: OffersConfigs.SEND_SIG_OP_EXPIRATION_SECS
    };
    // we will store here:
    // {
    //  url: {
    //    counter: N
    //  }
    // }
    // since we can get the last_update value from the container
    this.urlSignalsDB = new PersistentCacheDB('offers-signals-url', urlDBconfigs);
    this.urlSignalsDB.loadEntries();

    // we will store here the latest conversion that happened for a campaign id:
    // {
    //  cid: {
    //    sig_name: {
    //      counter: N,on
    //      l_u_ts: last timestamp happened.
    //    }
    //  }
    // }
    this.lastCampaignSignalDB = new PersistentCacheDB('offers-last-cmp-signals', urlDBconfigs);
    this.lastCampaignSignalDB.loadEntries();
  }
}
