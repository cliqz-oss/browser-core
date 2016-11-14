import messageContext from "hpn/message-context";
import JsonFormatter, { createHttpUrl, getRouteHash } from "hpn/utils";
import CliqzSecureMessage from 'hpn/main';
import utils from "core/utils";
import environment from "platform/environment";


export function overRideCliqzResults(){
  if(utils.getPref("proxyNetwork", true) == false) return;

  if(!environment._httpHandler) environment._httpHandler = environment.httpHandler;
  environment.httpHandler = function(method, url, callback, onerror, timeout, data, sync){
    if(url.indexOf(utils.RESULTS_PROVIDER) > -1 && utils.getPref('hpn-query', false)) {
      var _q = url.replace((utils.RESULTS_PROVIDER),"")
      var mc = new messageContext({"action": "extension-query", "type": "cliqz", "ts": "", "ver": "1.5", "payload":_q, "rp": utils.RESULTS_PROVIDER});
      var proxyIP = CliqzSecureMessage.queryProxyIP;
      mc.aesEncrypt()
      .then(function(enxryptedQuery){
        return mc.signKey();
      })
      .then(function(){
        var data = {"mP":mc.getMP()}
        CliqzSecureMessage.stats(proxyIP, "queries-sent", 1);
        return CliqzSecureMessage.httpHandler(proxyIP)
        .post(JSON.stringify(data), "instant")
      })
      .then(function(response){
        return mc.aesDecrypt(JSON.parse(response)["data"]);
      })
      .then(function(res){
        CliqzSecureMessage.stats(proxyIP, "queries-recieved", 1);
        callback && callback({"response":res});
      })
      .catch(function(err){
        utils.log("Error query chain: " + err,CliqzSecureMessage.LOG_KEY);
        CliqzSecureMessage.stats(proxyIP, "queries-error", 1);
      })
      return null;
    } else if(url.indexOf(utils.RESULTS_PROVIDER_LOG) > -1 && utils.getPref('hpn-telemetry', false)) {
      var _q = url.replace(utils.RESULTS_PROVIDER_LOG,"")
      var mc = new messageContext({"action": "extension-result-telemetry", "type": "cliqz", "ts": "", "ver": "1.5", "payload":_q });
      var proxyIP = CliqzSecureMessage.queryProxyIP;
      mc.aesEncrypt()
      .then(function(enxryptedQuery){
        return mc.signKey();
      })
      .then(function(){
        var data = {"mP":mc.getMP()}
        CliqzSecureMessage.stats(proxyIP, "queries-sent", 1);
        return CliqzSecureMessage.httpHandler(proxyIP)
        .post(JSON.stringify(data), "instant")
      })
      .catch(function(err){
        utils.log("Error query chain: " + err,CliqzSecureMessage.LOG_KEY);
        CliqzSecureMessage.stats(proxyIP, "result-telemetry-error", 1);
      })
      return null;
    }
    else if(url == utils.SAFE_BROWSING && utils.getPref('hpn-telemetry', false)){
      var batch = JSON.parse(data);
      if(batch.length > 0){
        batch.forEach(function(eachMsg){
          CliqzSecureMessage.telemetry(eachMsg);
        })
      }
      callback && callback({"response":'{"success":true}'});
    }
    else{
      return environment._httpHandler.apply(utils, arguments);
    }
  }
  if(!environment._promiseHttpHandler) environment._promiseHttpHandler = environment.promiseHttpHandler;
  utils.promiseHttpHandler = function(method, url, data, timeout, compressedPost) {
    if(url == utils.SAFE_BROWSING && utils.getPref('hpn-telemetry', false)){
      return environment._promiseHttpHandler(method, url, data, timeout, false);
    }
    else{
      return environment._promiseHttpHandler.apply(utils, arguments);
    }
  }
}
