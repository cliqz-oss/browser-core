// var sample_message = {"action": "alive","mode":"safe", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"};

/*
chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
	if (request.getTargetData)
		{
			sendResponse({targetData: "ss"})
      	}
    else if (request.activateLasers) {
      var success = activateLasers();
      sendResponse({activateLasers: success});
    }
  });

*/
  // For long-lived connections:
chrome.runtime.onConnectExternal.addListener(function(port) {
  port.onMessage.addListener(function(request) {
	var mc = new messageContext(request.msg);
	mc.aesEncrypt()
	.then(function(enxryptedQuery){
		return mc.signKey();
	})
	.then(function(){
		var data = {"mP":mc.getMP()}
		return _http("http://54.211.9.241/verify")
			   .post(JSON.stringify(data), "instant")
	})
	.then(function(response){
		if(request.msg.action != "extension-query") return;
		return mc.aesDecrypt(JSON.parse(response)["data"]);
	})
	.then(function(res){
	// callback && callback({"response":res});
		console.log(res);
		port.postMessage({"response":res});
	})
  });
});