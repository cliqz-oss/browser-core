import { utils } from 'core/cliqz';
import LoggingHandler from 'offers/logging_handler';
import OffersConfigs from 'offers/offers_configs';
import { loadFileFromChrome } from 'offers/utils';


////////////////////////////////////////////////////////////////////////////////
// Consts
//
const MODULE_NAME = 'coupon_handler';


////////////////////////////////////////////////////////////////////////////////
function incCounter(d, f) {
  if (!d[f]) {
    d[f] = 1;
  } else {
    d[f] += 1;
  }
}

////////////////////////////////////////////////////////////////////////////////
// TODO: remove this method and the usage of it
function printSet(setName, s) {
  let str = '{';
  s.forEach(v => {
    str += v + ', ';
  });
  str += '}';
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'SET ' + setName + ': ' + str);
}

////////////////////////////////////////////////////////////////////////////////
export class CouponHandler {
  //
  // @brief constructor:
  //
  constructor(mappings) {
    // the offers subclusters info (A|B): clusterID -> {}
    this.offerSubclusterInfo = null;
    this.mappings = mappings;
    // coupons information
    this.couponData = {};

    // load the subclusters
    this.loadOfferSubclusters();

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'init properly');
  }


  ////////////////////////////////////////////////////////////////////////////////

  //
  // @brief save to file
  //
  savePersistentData() {
    // this flag is to let us test easier the things
    if (!OffersConfigs.COUPON_HANDLER_LOAD_FILE_FLAG) {
      return;
    }
    var localStorage = CliqzUtils.getLocalStorage(OffersConfigs.COUPONS_DATA_LOCAL_STORAGE_URL);
    if (localStorage) {
      localStorage.setItem('coupons_data', JSON.stringify(this.couponData));

      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'saving coupons_data db: ' + JSON.stringify(this.couponData));
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  //
  // @brief load from file
  //
  loadPersistentData() {
    // this flag is to let us test easier the things
    if (!OffersConfigs.COUPON_HANDLER_LOAD_FILE_FLAG) {
      return;
    }
    var localStorage = CliqzUtils.getLocalStorage(OffersConfigs.COUPONS_DATA_LOCAL_STORAGE_URL);

    if (OffersConfigs.COUPON_HANDLER_RESET_FILE) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'reseting the database to empty');
      localStorage.setItem('coupons_data', JSON.stringify({}));
    }

    var cache = localStorage.getItem('coupons_data');
    if (cache) {
      this.couponData = JSON.parse(cache);
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'coupons_data db found, loading data: ' + JSON.stringify(this.couponData));
    } else {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'coupons_data db NOT found');
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  //
  // @brief Get the best coupon from the backend response and the given cluster.
  // @return the coupon | null if there are no coupon
  //
  selectBestCoupon(evtDomID, evtClusterID, vouchersList) {
    if (!vouchersList) {
      return null;
    }

    // first of all we need to filter all the used coupons
    var couponIDsToFilter = this.getCouponIDsToFilter(evtClusterID);
    var vouchers = this.filterUsedVouchers(vouchersList, couponIDsToFilter);

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                       'Vouchers before filtering ' + JSON.stringify(vouchersList) +
                       '\n - afterFiltering: ' + JSON.stringify(vouchers) +
                       '\n - filters: ' + JSON.stringify([...couponIDsToFilter]));


    // we need to apply the new A|B logic here and also add the new telemetry
    // signals
    // The following logic will be applied depending of the switch flag:
    // We have 2 subclusters: A, B.
    // if switchFlag == true => A->B and B->A
    // else => A -> A and B -> B
    //
    // for those clusters that we don't have this subclusters we always follow
    // the next logic:
    // - We always show a voucher.
    // - if we are in a domain and we have a voucher from another domain we show
    //   that first
    // - otherwise we show the voucher of the same domain.
    // - track this with a counter in stats (voucher_on_same_domain or whatever).
    //

    // get the global flag if we need to switch or not
    const switchFlag = OffersConfigs.OFFER_SUBCLUSTER_SWITCH;

    // check if we have a subcluster mapping
    var subclusterMap = (this.offerSubclusterInfo !== null) ? this.offerSubclusterInfo[evtClusterID]
                                                            : undefined;

    // get a default voucher just in case
    var voucher = null;
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                       'getBestCoupon: selecting best coupon for switch: ' + switchFlag +
                       ' - subclusterMap: ' + subclusterMap);

    // this function will select from the list of vouchers and a set of domains ids
    // the one that "best" matches. If set of domains is empty then any will be chosen
    function selectBestVoucher(voucherMap, domSet) {
      var rvoucher = null;
      for (var did in voucherMap) {
        if (!voucherMap.hasOwnProperty(did) || (domSet.size > 0 && !domSet.has(Number(did)))) {
          continue;
        }
        // this domain is good for us, still we need to check if there is a better
        // one
        let coupons = voucherMap[did];
        if (coupons.length > 0) {
          rvoucher = coupons[0];
          if (rvoucher) {
            break;
          }
        }
      }
      return rvoucher;
    }

    // apply the main logic
    if (subclusterMap) {
      printSet('A', subclusterMap['A']);
      printSet('B', subclusterMap['B']);
      // we need to use the cluster thing to get the best voucher
      const userOnSubcluster = (subclusterMap['A'].has(evtDomID)) ? 'A' : 'B';
      if (!subclusterMap[userOnSubcluster].has(evtDomID)) {
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.error(MODULE_NAME,
                             'The user is not nor in A or B subcluster, this is an error. ' +
                             'userEvtID: ' + evtDomID + '\ttag: ' + userOnSubcluster +
                             '\tsubclusterMap: ' + JSON.stringify(subclusterMap),
                             LoggingHandler.ERR_INTERNAL);
        return voucher;
      }
      // now check if we need to switch or not
      var subclusterToSearch = '';
      if (switchFlag) {
        // we need to get a coupon from the other side
        subclusterToSearch = userOnSubcluster === 'A' ? 'B' : 'A';
      } else  {
        subclusterToSearch = userOnSubcluster;
      }
      // search in this
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME,
                         'getBestCoupon: selecting voucher for subcluster: ' + subclusterToSearch +
                         ' - user on subcluster: ' + userOnSubcluster +
                         ' - userDomainID: ' + evtDomID);
      const domainsToSearch = subclusterMap[subclusterToSearch];
      let localVoucher = selectBestVoucher(vouchers, domainsToSearch);

      // check if we found a voucher we want
      if (!localVoucher) {
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.warning(MODULE_NAME,
                               'We didnt find any coupon to be returned here, ' +
                               'this could be because we already show it before ' +
                               'or the filter logic was applied for any of the possible ' +
                               'cases');
        return voucher;
      }

      // we found one, add the subcluster flag and just return it
      localVoucher['subcluster_tag'] = subclusterToSearch;
      return localVoucher;
    } else {
      // we just need to get any voucher that is not evtDomID if possible
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME,
                         'getBestCoupon: selectiong the best voucher from all (no A|B logic)');
      return selectBestVoucher(vouchers, new Set());
    }

  }

  ////////////////////////////////////////////////////////////////////////////////
  //
  // @brief this method will add a new coupon to be track in this class so we
  //        can query information later on.
  // @param coupon is the coupon that we are using / showing now.
  //
  trackNewCoupon(couponInfo) {
    const couponID = couponInfo.code;
    const clusterID = couponInfo.cluster_id;
    // generate new data structure for this
    if (!this.couponData.hasOwnProperty(clusterID)) {
      this.couponData[clusterID] = {};
    }
    if (!this.couponData[clusterID][couponID]) {
      this.couponData[clusterID][couponID] = {};
    }

    // nothing else to do
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                        'trackNewCoupon executed [' + couponID +
                        '] this.couponData: ' + JSON.stringify(this.couponData));
  }

  ////////////////////////////////////////////////////////////////////////////////
  //  Operations that we can apply to particular coupons
  //

  markCouponAsShown(couponInfo, timestamp) {
    const couponID = couponInfo.code;
    const clusterID = couponInfo.cluster_id;
    if (!this.couponData.hasOwnProperty(clusterID) ||
        !this.couponData[clusterID].hasOwnProperty(couponID)) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'trying to mark a coupon as used but we dont ' +
                           'even have the cluster ID: ' + clusterID +
                           ' or we dont have the couponID: ' + couponID,
                           LoggingHandler.ERR_INTERNAL);
      return;
    }
    // add the last shown timestamp
    this.couponData[clusterID][couponID]['last_shown_ts'] = timestamp;

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'markCouponAsShown properly executed');
  }

  markCouponAsUsed(couponInfo, timestamp) {
    const couponID = couponInfo.code;
    const clusterID = couponInfo.cluster_id;
    if (!this.couponData.hasOwnProperty(clusterID) ||
        !this.couponData[clusterID].hasOwnProperty(couponID)) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'trying to mark a coupon as used but we dont ' +
                           'even have the cluster ID: ' + clusterID +
                           ' or we dont have the couponID: ' + couponID,
                           LoggingHandler.ERR_INTERNAL);
      return;
    }
    // add the elements
    this.couponData[clusterID][couponID]['last_used_ts'] = timestamp;
    incCounter(this.couponData[clusterID][couponID],'used_c');

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'markCouponAsUsed properly executed');
  }

  markCouponAsRejected(couponInfo, timestamp) {
    const couponID = couponInfo.code;
    const clusterID = couponInfo.cluster_id;
    if (!this.couponData.hasOwnProperty(clusterID) ||
        !this.couponData[clusterID].hasOwnProperty(couponID)) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'trying to mark a coupon as used but we dont ' +
                           'even have the cluster ID: ' + clusterID +
                           ' or we dont have the couponID: ' + couponID,
                           LoggingHandler.ERR_INTERNAL);
      return;
    }
    // add the last shown timestamp
    this.couponData[clusterID][couponID]['last_ur_ts'] = timestamp;
    incCounter(this.couponData[clusterID][couponID],'ur_c');

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'markCouponAsRejected properly executed');
  }

  markCouponAsClosedByUser(couponInfo, timestamp) {
    const couponID = couponInfo.code;
    const clusterID = couponInfo.cluster_id;
    if (!this.couponData.hasOwnProperty(clusterID) ||
        !this.couponData[clusterID].hasOwnProperty(couponID)) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'trying to mark a coupon as used but we dont ' +
                           'even have the cluster ID: ' + clusterID +
                           ' or we dont have the couponID: ' + couponID,
                           LoggingHandler.ERR_INTERNAL);
      return;
    }
    // add the last shown timestamp
    this.couponData[clusterID][couponID]['last_uc_ts'] = timestamp;
    incCounter(this.couponData[clusterID][couponID],'uc_c');


    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'markCouponAsClosedByUser properly executed');
  }

  markCouponAsClosedBySystem(couponInfo, timestamp) {
    const couponID = couponInfo.code;
    const clusterID = couponInfo.cluster_id;
    if (!this.couponData.hasOwnProperty(clusterID) ||
        !this.couponData[clusterID].hasOwnProperty(couponID)) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'trying to mark a coupon as used but we dont ' +
                           'even have the cluster ID: ' + clusterID +
                           ' or we dont have the couponID: ' + couponID,
                           LoggingHandler.ERR_INTERNAL);
      return;
    }
    // add the last shown timestamp
    this.couponData[clusterID][couponID]['last_cbs_ts'] = timestamp;
    incCounter(this.couponData[clusterID][couponID],'cbs_c');

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'markCouponAsClosedBySystem properly executed');
  }


  //////////////////////////////////////////////////////////////////////////////
  //                              PRIVATE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////

  //
  // @brief this function will return all the ids of coupons we need to filter
  //
  getCouponIDsToFilter(clusterID) {
    // we need to filter all the coupons they have been:
    // 1) used by the user
    // 2) marked as rejected by button
    // 3) user closed the offer >= 1
    // 4) closed by system >= 3
    //
    var result = new Set();
    if (!this.couponData.hasOwnProperty(clusterID)) {
      return result;
    }

    var coupons = this.couponData[clusterID];
    for (var couponID in coupons) {
      if (!coupons.hasOwnProperty(couponID)) {
        continue;
      }
      const coupon = coupons[couponID];
      if (coupon.hasOwnProperty('used_c') ||
          coupon.hasOwnProperty('ur_c') && coupon.hasOwnProperty('ur_c') > 1 ||
          (coupon.hasOwnProperty('uc_c') && coupon['uc_c'] > 2) ||
          (coupon.hasOwnProperty('cbs_c') && coupon['cbs_c'] >= 3)) {
        // we need to filter this one
        result.add(couponID);
      }
    }

    return result;
  }

  //
  // @brief this method will remove all the vouchers that we already used
  //
  filterUsedVouchers(vouchers, couponIDs) {
    var filteredVouchers = {};
    for (var did in vouchers) {
      if (!vouchers.hasOwnProperty(did)) {
        continue;
      }
      let coupons = vouchers[did];
      var newList = [];
      for (let i = 0; i < coupons.length; ++i) {
        const coupon = coupons[i];
        if (coupon.code && !couponIDs.has(coupon.code)) {
          // we add this one
          newList.push(coupon);
        }
      }

      // replace the list with the new one
      filteredVouchers[did] = newList;
    }

    return filteredVouchers;
  }



  //////////////////////////////////////////////////////////////////////////////
  //
  // @brief this method will load the groups (A|B for now) for the clusters (if we have)
  //        to check what kind of logic we need to apply when selection the offer
  //        to show.
  // Expected format of the file:
  //  {
  //    cluster_id: {
  //      'A': [dom1, dom2, ...],
  //      'B': [domN+1, domN+2, ...],
  //    }
  //  }
  // we will generate the this.offerSubclusterInfo structure with the following
  // (transforming them into domain IDs)
  // information:
  //  {
  //    cluster_id: {
  //      'A': Set(dom_ID, dom_ID2, ...),
  //      'B': set(dom_IDN+1, dom_IDN+2, ...),
  //    }
  //  }
  //
  loadOfferSubclusters() {
    var self = this;
    loadFileFromChrome(['offers', 'offer_subclusters.json']).then(jsonData => {
      let json = JSON.parse(jsonData);
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME,
                         'loading the json for loadOfferSubclusters json stringify: ' +
                         JSON.stringify(json));
      // we now load all the clusters and all the domains and we convert the domains
      // into domains ids
      self.offerSubclusterInfo = {};

      for (let cid in json) {
        if (!json.hasOwnProperty(cid)) {
          continue;
        }

        // now convert 'A' and 'B' into sets
        var currentCluster = json[cid];
        if (!currentCluster['A'] || !currentCluster['B']) {
          LoggingHandler.LOG_ENABLED &&
          LoggingHandler.warning(MODULE_NAME,
                                 'it is missing A or B in the ' +
                                 'file?... we will skip self one');
          continue;
        }

        self.offerSubclusterInfo[cid] = {};
        const tagList = ['A', 'B'];
        for (let tagIndex in tagList) {
          const tag = tagList[tagIndex];
          // iterate over the list and generate the set with domains IDS
          self.offerSubclusterInfo[cid][tag] = new Set();
          for (let domNameIndex in currentCluster[tag]) {
            const domName = currentCluster[tag][domNameIndex];
            const domID = self.mappings['dname_to_did'][domName];
            if (domID === undefined) {
              LoggingHandler.LOG_ENABLED &&
              LoggingHandler.error(MODULE_NAME,
                                   'There is a domain in the subclusters that is not ' +
                                   'listed in the global cluster file? or in the ' +
                                   'mappings? domName: ' + domName + ' - clusterID: ' + cid,
                                   LoggingHandler.ERR_INTERNAL);
              continue;
            }
            self.offerSubclusterInfo[cid][tag].add(Number(domID));
            LoggingHandler.LOG_ENABLED &&
            LoggingHandler.info(MODULE_NAME,
                               'adding domain: ' + domName + ' - ' + domID + ' to tag ' + tag);
          }
        }
      }
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME,
                         'loadOfferSubclusters: ' + JSON.stringify(self.offerSubclusterInfo));
    }).catch(function(e) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'Loading the OfferSubclusters: ' + e,
                           LoggingHandler.ERR_JSON_PARSE);
    });
  }


}
