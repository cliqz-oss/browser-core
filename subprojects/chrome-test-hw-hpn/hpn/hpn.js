var HPN = {
	VERSION: '0.1',
	LOG_KEY: 'securemessage',
	DEBUG: true,
	testMessage: function(){
		var sample_message = [
								{"action":"extension-query","type":"cliqz","ts":"","ver":"1.5","payload":"a&s=Mdw1i5slNi95U3DCaw9dCJWdRQPWM3CV&n=1&qc=0&lang=en%2Cde&locale=en-US&force_country=true&adult=0&loc_pref=ask"},
								{"action": "alive","mode":"safe", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}
							 ]
		sample_message.forEach( e=> {
			var mc = new messageContext(e);
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
				if(e.action != "extension-query") return;
				return mc.aesDecrypt(JSON.parse(response)["data"]);
			})
			.then(function(res){
				// callback && callback({"response":res});
				console.log(res);
			})
		})

	}

}