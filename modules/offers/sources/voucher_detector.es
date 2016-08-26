import LoggingHandler from 'offers/logging_handler';
import {utils} from 'core/cliqz';
import OffersConfigs from 'offers/offers_configs';
import { loadFileFromChrome } from 'offers/utils';

////////////////////////////////////////////////////////////////////////////////
// Consts
//
const MODULE_NAME = 'voucher_detector';

////////////////////////////////////////////////////////////////////////////////
export class VoucherDetector {

  constructor() {
    this.currentRegEx = {};
    this.validDomains = new Set(['lieferando', 'deliveroo', 'hotels', 'reisen', 'bdi-services']);
    this.loadRegEx();
  }

  loadRegEx() {
    // we will use the CliqzStorage here
    let localStorage = utils.getLocalStorage(OffersConfigs.VOUCHER_REGEX_LOCAL_STORAGE_URL);
    // if we are on debug mode we will reload everything from extension
    let cache = (OffersConfigs.DEBUG_MODE) ? null : localStorage.getItem('vouchers_used_regex');
    let self = this;
    if (!cache) {
      // we need to write this then
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'no voucher regex db found, creating new one');
      loadFileFromChrome(['offers', 'vouchers_used_regex.json']).then(raw => {
          let json = JSON.parse(raw);
          self.updateCurrentRegEx(json);
      }).catch(err => {
       LoggingHandler.LOG_ENABLED && LoggingHandler.error(MODULE_NAME, err);
       return;
     });
    } else {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'voucher regex db found, loading it: ' + cache);
      self.updateCurrentRegEx(JSON.parse(cache));
    }
  }


  // http://www.rlvision.com/blog/using-wildcard-matching-in-any-programming-language/
  globsMatch(find, source) {
    find = find.replace(/[\-\[\]\/\{\}\(\)\+\.\\\^\$\|]/g, "\\$&");
    find = find.replace(/\*/g, ".*");
    find = find.replace(/\?/g, ".");
    var regEx = new RegExp(find, "i");
    return regEx.test(source);
  }

  processRequest(requestObj) {
    let domainName = utils.getDetailsFromUrl(requestObj.url)['name'];
    let domainRegexArray = this.currentRegEx[domainName];
    for (let idx in domainRegexArray) {
      if (domainRegexArray.hasOwnProperty(idx)) {
        let domainRegex = domainRegexArray[idx];
        if(this.globsMatch(domainRegex['url_regex'], requestObj.url)) {
          LoggingHandler.LOG_ENABLED &&
          LoggingHandler.info(MODULE_NAME, "Found request handler:" + domainRegex['url_regex']);
          if(domainRegex['method'] === "GET") {
            return this.detectGetData(requestObj, domainRegex, domainName);
          } else if(domainRegex['method'] === "POST") {
            return this.detectPostData(requestObj, domainRegex, domainName);
          }
        }
      }
    }
  }

  saveCurrentRegEx() {
    let localStorage = utils.getLocalStorage(OffersConfigs.VOUCHER_REGEX_LOCAL_STORAGE_URL);
    localStorage.setItem('vouchers_used_regex', JSON.stringify(this.currentRegEx));
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, "#saveCurrentRegEx: " + JSON.stringify(this.currentRegEx)  +
      " saved to localStorage");
  }

  updateCurrentRegEx(voucherObj) {
    for (let item of this.validDomains) {
      if(voucherObj.hasOwnProperty(item)) {
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.info(MODULE_NAME, "voucherObj has property " + item);
        this.currentRegEx[item] = voucherObj[item];
      }
      else {
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.info(MODULE_NAME, "voucherObj doesnt have property " + item);
      }
    }
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, "#updateCurrentRegEx: " + "voucherObj:\t" +
      JSON.stringify(voucherObj) + "\tcurrentRegex:\t" + JSON.stringify(this.currentRegEx) +
      " currentRegEx was updated");
  }

  // Private API
  createResponse(match, domainName, domainRegex) {
    let response = null;
    if(match && match[1]) {
      let code = match[1];
      const isDownload = domainRegex['is_download'] === true;
      response = {"domain": domainName, "code": code, "is_download": isDownload};
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, "Voucher Detected: " + JSON.stringify(response));
    }
    return response;
  }

  detectGetData(requestObj, domainRegex, domainName){
    // LoggingHandler.LOG_ENABLED &&
    // LoggingHandler.info(MODULE_NAME, "detectGetData: \t requestObj: " + JSON.stringify(requestObj) +
    //                     " domainRegex: " + JSON.stringify(domainRegex));
    let match = requestObj.url.match(new RegExp(domainRegex['code_regex']));
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, "detectGetData: match \t " + match);
    return this.createResponse(match, domainName, domainRegex);
  }

  detectPostData(requestObj, domainRegex, domainName){
    let postData = requestObj.getPostData();
    if(domainRegex['parse_body'] && domainRegex['parse_body'] === true){
      let code = postData && JSON.parse(postData['body'])[domainRegex['code_regex']];
      return {"domain": domainName, "code": code};
    } else {
      let match = postData && postData['body'].match(new RegExp(domainRegex['code_regex']));
      return this.createResponse(match, domainName, domainRegex);
    }
  }


}

