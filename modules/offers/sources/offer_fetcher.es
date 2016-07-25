import { utils } from 'core/cliqz';
import  OffersConfigs  from 'offers/offers_configs';
import LoggingHandler from 'offers/logging_handler';

// var assert = require('assert');


const MODULE_NAME = 'offer_fetcher';

////////////////////////////////////////////////////////////////////////////////
// api function builder
//
var BE_ACTION = {
  GET: 'get',
  MARK_USED: 'mark_used',
  IS_USED: 'is_used',
};

function getQueryString(action, argsNames, argsValues) {
  // assert(argsNames.length === argsValues.length);

  let result = action;
  for (let i = 0; i < argsNames.length; ++i) {
    result += '|' + String(argsNames[i]) + '=' + String(argsValues[i]);
  }
  return result;
}

////////////////////////////////////////////////////////////////////////////////

//
// @brief this method will parse a bm response and extract the vouchers part from
//        it and format it as we need.
// @param httpResp  The response we get from the httpRequest.
// @return json vouchers part or null on error.
//
function parseHttpResponse(httpResp) {
  var vouchers = null;
  try {
      var jResp = JSON.parse(httpResp.responseText);
      vouchers = jResp['results'][0]['data']['vouchers'];
    } catch (e) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME, 'Error parsing the httpResp:\n' +
         httpResp.responseText + '\nwith error: ' + e,
         LoggingHandler.ERR_JSON_PARSE);
    }
    return vouchers;
}

////////////////////////////////////////////////////////////////////////////////

//
// @brief Creates the offer fetcher with the backend address to where we will
//        fetch and mark coupons as used.
//        [http://mixer-beta.clyqz.com/api/v1/rich-header?path=/map&bmresult=vouchers.cliqz.com&]
// @param backendAddr is the address we will hit to query the coupons.
// @param mappings is the mappings for the clusters and domains (same than python model)
//
export function OfferFetcher(backendAddr, mappings = null) {
  // assert(mappings !== null);
  // assert(mappings['dname_to_did'] !== undefined);
  // assert(mappings['dname_to_cid'] !== undefined);

  this.beAddr = backendAddr;
  this.mappings = mappings;

  // temporary cache to avoid multiple queries
  this.cache = {};

}


//
// @brief get a list of available coupons for a cluster
// @param clusterID  The cluster id to check to
// @param callback    The callback to be called on success if we could get vouchers
// @returns a list of coupons structure on the callback
//
OfferFetcher.prototype.checkForCouponsByCluster = function(clusterID, callback) {
  // assert(this.beAddr.length > 0);
  // assert(this.mappings !== null);
  let self = this;

  if(this.cache.hasOwnProperty(clusterID)) {
    let tsDiff = Date.now() - this.cache[clusterID]['ts'];
    if (tsDiff <= OffersConfigs.TS_THRESHOLD) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'using cached vouchers');
      callback && callback(this.cache[clusterID]['vouchers']);
      return;
    }
  }


  let vouchersObj = null;
  // it should exists for sure (mappings is wrong if not and cannot happen).
  // assert(clusterID !== undefined && clusterID >= 0);
  let argNames = ['cluster_id'];
  let argValues = [clusterID];
  let destURL = this.beAddr + 'q=' + getQueryString(BE_ACTION.GET, argNames, argValues);

  // perform the call and wait for the response
  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'we will hit the endpoint: ' + destURL);

  utils.httpGet(destURL, function success(resp) {
      vouchersObj = parseHttpResponse(resp);
      if(vouchersObj) {
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.info(MODULE_NAME, 'voucher received');
        // temporary cache to avoid multiple queries
        if(!self.cache.hasOwnProperty(clusterID)) {
          self.cache[clusterID] = {};
        }
        self.cache[clusterID]['ts'] = Date.now();
        self.cache[clusterID]['vouchers'] = vouchersObj;
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.info(MODULE_NAME, 'updated cached vouchers as time expired');
      }

      callback && callback(vouchersObj);

    }, function error(resp) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
        'error getting the coupongs from the backend:\n' + resp.responseText,
         LoggingHandler.ERR_BACKEND);
    }
  );

};

//
// @brief mark a coupon as used
// @param couponID the coupon we want to mark as used
//
OfferFetcher.prototype.markCouponAsUsed = function(couponID) {
  let vouchersObj = null;
  let argNames = ['coupon_id'];
  let argValues = [couponID];
  let destURL = this.beAddr + 'q=' + getQueryString(BE_ACTION.MARK_USED, argNames, argValues);

  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'marking a coupon as used: ' + destURL);

  utils.httpGet(destURL, function success(resp) {
      vouchersObj = parseHttpResponse(resp);
      if (vouchersObj['mark_used'] === true) {
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.info(MODULE_NAME, 'coupon ' + String(couponID) + ' marked as used');
      } else {
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.warning(MODULE_NAME, 'coupon ' + String(couponID) + ' was already marked as used');
      }
    }, function error(resp) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
        'error marking a coupon as used:\n' + resp.responseText,
        LoggingHandler.ERR_BACKEND);
    }
  );

};

//
// @brief Check if a coupon is already used or not.
// @param couponID the coupons id to check
// @param callback the callback to be called on success after we check if a coupon
//                 is used or not
// @return true if it used or false otherwise
//
OfferFetcher.prototype.isCouponUsed = function(couponID, callback) {
  let vouchersObj = null;
  let argNames = ['coupon_id'];
  let argValues = [couponID];
  let destURL = this.beAddr + 'q=' + getQueryString(BE_ACTION.IS_USED, argNames, argValues);

  LoggingHandler.LOG_ENABLED &&
  LoggingHandler.info(MODULE_NAME, 'checking coupon status: ' + destURL);

  utils.httpGet(destURL, function success(resp) {
    vouchersObj = parseHttpResponse(resp);
    callback && callback(vouchersObj['is_used']);
  }, function error(resp) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
        'error checking coupon status:\n' + resp.responseText,
        LoggingHandler.ERR_BACKEND);
    }
    );
};



