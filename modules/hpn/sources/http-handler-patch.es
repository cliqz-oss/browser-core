import messageContext from "hpn/message-context";
import JsonFormatter, { createHttpUrl, getRouteHash } from "hpn/utils";
import CliqzSecureMessage from 'hpn/main';


export function overRideCliqzResults(){
  if(CliqzUtils.getPref("proxyNetwork", true) == false) return;

  if(!CLIQZEnvironment._httpHandler) CLIQZEnvironment._httpHandler = CLIQZEnvironment.httpHandler;
  CLIQZEnvironment.httpHandler = function(method, url, callback, onerror, timeout, data, sync){
    if(url.indexOf(CliqzUtils.RESULTS_PROVIDER) > -1 && CliqzUtils.getPref('hpn-query', false)) {
      var _q = url.replace((CliqzUtils.RESULTS_PROVIDER),"")
      var mc = new messageContext({"action": "extension-query", "type": "cliqz", "ts": "", "ver": "1.5", "payload":_q });
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
        CliqzUtils.log("Error query chain: " + err,CliqzSecureMessage.LOG_KEY);
        CliqzSecureMessage.stats(proxyIP, "queries-error", 1);
      })
      return null;
    } else if(url.indexOf(CliqzUtils.RESULTS_PROVIDER_LOG) > -1 && CliqzUtils.getPref('hpn-telemetry', false)) {
      var _q = url.replace(CliqzUtils.RESULTS_PROVIDER_LOG,"")
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
        CliqzUtils.log("Error query chain: " + err,CliqzSecureMessage.LOG_KEY);
        CliqzSecureMessage.stats(proxyIP, "result-telemetry-error", 1);
      })
      return null;
    }
    else if(url == CliqzUtils.SAFE_BROWSING && CliqzUtils.getPref('hpn-telemetry', false)){
      var batch = JSON.parse(data);
      if(batch.length > 0){
        batch.forEach(function(eachMsg){
          CliqzSecureMessage.telemetry(eachMsg);
        })
      }
      callback && callback({"response":'{"success":true}'});
    }
    else{
      return CLIQZEnvironment._httpHandler.apply(CLIQZEnvironment, arguments);
    }
  }
  if(!CLIQZEnvironment._promiseHttpHandler) CLIQZEnvironment._promiseHttpHandler = CLIQZEnvironment.promiseHttpHandler;
  CLIQZEnvironment.promiseHttpHandler = function(method, url, data, timeout, compressedPost) {
    if(url == CliqzUtils.SAFE_BROWSING && CliqzUtils.getPref('hpn-telemetry', false)){
      return CLIQZEnvironment._promiseHttpHandler(method, url, data, timeout, false);
    }
    else{
      return CLIQZEnvironment._promiseHttpHandler.apply(CLIQZEnvironment, arguments);
    }
  }
}
