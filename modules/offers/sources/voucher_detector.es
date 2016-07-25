import LoggingHandler from 'offers/logging_handler';
import {utils} from 'core/cliqz';

////////////////////////////////////////////////////////////////////////////////
// Consts
//
const MODULE_NAME = 'voucher_detector';

////////////////////////////////////////////////////////////////////////////////
export class VoucherDetector {

  constructor() {
    let self = this;
    this.validDomains = {
      "lieferando": {"regex": "*lieferando.de/*/*/discount", "func": self.detectVoucherLieferando.bind(self)},
      "deliveroo": {"regex": "https://deliveroo.de/*/vouchers", "func": self.detectVoucherDeliveroo.bind(self)},
      "hotels": {"regex": "*hotels.com/booking/apply_discount", "func": self.detectVoucherHotels.bind(self)},
      "reisen": {"regex": "*reisen.de/nsibe/booking/booking/key/*", "func": self.detectVoucherReisen.bind(self)},
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
    let domainRegex = this.validDomains[domainName];
    if(domainRegex) {
      if(this.globsMatch(domainRegex['regex'], requestObj.url)) {
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.info(MODULE_NAME, "Found request handler:" + domainRegex['regex']);
        return domainRegex['func'](requestObj);
      }
    }

  }

  // Private API
  createResponse(match, domainName) {
    let response = null;
    if(match && match[1]) {
      let code = match[1];
      response = {"domain": domainName, "code": code};
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, "Voucher Detected: " + JSON.stringify(response));
    }
    return response;
  }

  detectVoucherReisen(requestObj) {
    let postData = requestObj.getPostData();
    let match = postData && postData['body'].match(/customerCouponCode=([^&]*)/);
    return this.createResponse(match, "reisen");
  }

  detectVoucherHotels(requestObj) {
    let postData = requestObj.getPostData();
    let match = postData['body'].match(/bookingSignInDiscount.coupon.code=([^&]*)/);
    return this.createResponse(match, "hotels");
  }

  detectVoucherDeliveroo(requestObj) {
    let postData = requestObj.getPostData();
    let code = postData && JSON.parse(postData['body'])['redemption_code'];
    return this.createResponse(code, "deliveroo");
  }

  detectVoucherLieferando(requestObj) {
    let match = requestObj.url.match(/code=([^&]*)/);
    return this.createResponse(match, "lieferando");
  }


}

