var CliqzSecureMessage = {
	VERSION: '0.1',
	LOG_KEY: 'securemessage',
	debug: false,
	mode:"safe",
	counter: 0,
	tmult: 4,
  	tpace: 250,
	SOURCE_MAP_PROVIDER: "https://collector-proxy-network.cliqz.com/sourcemapjson?q=1",
	LOOKUP_TABLE_PROVIDER: "https://collector-proxy-network.cliqz.com/lookuptable?q=1",
	KEYS_PROVIDER: "https://collector-proxy-network.cliqz.com/signerKey?q=1",
	proxyList: null,
	routeTable: null,
	proxyStats:{},
	PROXY_LIST_PROVIDER: "https://collector-proxy-network.cliqz.com/proxyList?q=1",
	BLIND_SIGNER:"http://signer-proxy-network.cliqz.com/sign",
	USER_REG:"http://signer-proxy-network.cliqz.com/register",
	signerKey: null,
	loggerKey: null,
	localTemporalUniq:{},
	pacemakerId: null,
	dsPK : null,
	JSEncrypt: JSEncrypt,
	crypto: crypto,
	httpHandler:_http,
	testMessage: function(){
		var sample_message = [
								// {"action":"extension-query","type":"cliqz","ts":"","ver":"1.5","payload":"a&s=Mdw1i5slNi95U3DCaw9dCJWdRQPWM3CV&n=1&qc=0&lang=en%2Cde&locale=en-US&force_country=true&adult=0&loc_pref=ask"},
								{"action": "alive","mode":"safe", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110911"}, "ts": "20160812"}
							 ]
		sample_message.forEach( e=> {
			CliqzSecureMessage.telemetry(e);
		})
	},
	pacemaker: function() {
	  	if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % 10 == 0) {
	  		if (CliqzSecureMessage.debug) {
	  			CliqzUtils.log('Pacemaker: ' + CliqzSecureMessage.counter/CliqzSecureMessage.tmult , CliqzSecureMessage.LOG_KEY);
	  		}

	  	}

	  	/* Konark : Need to get the event from extension, to switch the proxyIP
	  	if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % 5 == 0) {
	  		var currentTime = Date.now();


	  		if(!CliqzUtils.getWindow() || !CliqzUtils.getWindow().CLIQZ || !CliqzUtils.getWindow().CLIQZ.UI) return;
	  		var tDiff = currentTime - CliqzUtils.getWindow().CLIQZ.UI.lastInputTime;

	  		if(tDiff > 0 && tDiff > (1000 * 2 * 1)){
	  			CliqzSecureMessage.proxyIP();
	  		}

	  		if(!CliqzSecureMessage.sourceMap){
	  			fetchSourceMapping();
	  		}

	  		if(!CliqzSecureMessage.routeTable){
	  			CliqzSecureMessage.fetchRouteTable();
	  		}
	  	}
		*/

	    //Fetch sourceMap
	    if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % (60 * 1 * 1) == 0) {
	    	if (CliqzSecureMessage.debug) {
	    		CliqzUtils.log('Load proxy list', CliqzSecureMessage.LOG_KEY);
	    	}
	    	fetchSourceMapping();
	    	CliqzSecureMessage.fetchProxyList();
	      	CliqzSecureMessage.fetchRouteTable();
	      	CliqzSecureMessage.prunelocalTemporalUniq();

	    }

	    //Fetch secure keys
	    if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % (60 * 60 * 1) == 0) {
	    	if (CliqzSecureMessage.debug) {
	    		CliqzUtils.log('Load signer keys', CliqzSecureMessage.LOG_KEY);
	    	}
	    	CliqzSecureMessage.fetchSecureKeys();

	    }

	    if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % (60 * 10 * 1) == 0) {
	    	if (CliqzSecureMessage.debug) {
	    		CliqzUtils.log('Save local temporalUniquness stats', CliqzSecureMessage.LOG_KEY);
	    	}
	    	CliqzSecureMessage.saveLocalCheckTable();
	    	CliqzSecureMessage.saveLocalProxyList();
	    	CliqzSecureMessage.saveLocalRouteTable();

	      // Flush proxy stats
	      // CliqzSecureMessage.flushProxyStats();
	    }

	    CliqzSecureMessage.counter += 1;
 	},
 	init: function(){
		if (CliqzSecureMessage.pacemakerId == null) {
		    CliqzSecureMessage.pacemakerId = setInterval(CliqzSecureMessage.pacemaker, CliqzSecureMessage.tpace, null);
		}
		CliqzSecureMessage.secureLogger = new secureLogger();
		CliqzSecureMessage.uPK = new userPK();
	    if(!CliqzSecureMessage.dsPK){
	      CliqzSecureMessage.dsPK = new directoryServicePK();
	    }
	    CliqzSecureMessage.loadLocalCheckTable();
    	if(!CliqzSecureMessage.proxyList) CliqzSecureMessage.loadLocalProxyList();
    	if(!CliqzSecureMessage.routeTable) CliqzSecureMessage.loadLocalRouteTable();
 	},
  	fetchRouteTable: function(){
		// This will fetch the route table from webservice.
		CliqzUtils.httpGet(CliqzSecureMessage.LOOKUP_TABLE_PROVIDER,
			function success(res){
				try{
					var routeTable = JSON.parse(res.response);
					CliqzSecureMessage.routeTable= routeTable;
				}
				catch(e){
					if (CliqzSecureMessage.debug) CliqzUtils.log("Could load content from route table", CliqzSecureMessage.LOG_KEY);
				}
			},
			function error(res){
				CliqzUtils.log('Error loading config. ', CliqzSecureMessage.LOG_KEY)
			});
  	},
  	fetchProxyList: function(){
  		// This will fetch the alive proxies from the webservice.
  		CliqzUtils.httpGet(CliqzSecureMessage.PROXY_LIST_PROVIDER,
  			function success(res){
  				try{
  					var proxyList = JSON.parse(res.response);
  					CliqzSecureMessage.proxyList = proxyList;
  				}
  				catch(e){
  					if (CliqzSecureMessage.debug) CliqzUtils.log("Could load content from proxy list", CliqzSecureMessage.LOG_KEY);
  				}
  			},
  			function error(res){
  				CliqzUtils.log('Error loading config. ', CliqzSecureMessage.LOG_KEY)
  			});
  	},
  	fetchSecureKeys: function(){
  		// This will fetch the public keys for signer and collector.
  		CliqzUtils.httpGet(CliqzSecureMessage.KEYS_PROVIDER,
  			function success(res){
  				try{
  					var keys = JSON.parse(res.response);
  					CliqzSecureMessage.signerKey = keys["signer"];
  					CliqzSecureMessage.loggerKey = keys["securelogger"];
  				}
  				catch(e){
  					if (CliqzSecureMessage.debug) CliqzUtils.log("Could load signer and secure logger keys", CliqzSecureMessage.LOG_KEY);
  				}
  			},
  			function error(res){
  				CliqzUtils.log('Error loading config. ', CliqzSecureMessage.LOG_KEY)
  			});
  	},
	prunelocalTemporalUniq: function(){
	  if(CliqzSecureMessage.localTemporalUniq){
	    var curr_time = Date.now();
	    var pi = 0;
	    Object.keys(CliqzSecureMessage.localTemporalUniq).forEach( e => {
	      var d = CliqzSecureMessage.localTemporalUniq[e]["ts"];
	      var diff = (curr_time - d);
	      if(diff >= (24 * 60 * 60 * 1000)) {
	        delete CliqzSecureMessage.localTemporalUniq[e];
	        pi += 1;
	      }
	    });
	    if(CliqzHumanWeb.actionStats) CliqzHumanWeb.actionStats['itemsLocalValidation'] = Object.keys(CliqzSecureMessage.localTemporalUniq).length;
	  }
	},
  	sha1: function(dataString){
	    var promise = new Promise(function(resolve, reject){
	      var documentBytes = stringToByteArray(dataString);
	      crypto.subtle.digest({
	        name:"SHA-1"
	      },
	        documentBytes
	      )
	      .then(function(hash){
	          var signatureBytes = new Uint8Array(hash);
	          resolve(byteArrayToHexString(signatureBytes));
	      })
	      .catch(function(err){
	          CliqzUtils.log(">>> Error" + err);
	          reject(err);
	      });
	    })
	    return promise;
  	},
  	trk: [],
  	trkTimer: null,
  	telemetry: function(msg, instantPush) {
	    if (msg) CliqzSecureMessage.trk.push(msg);
	    clearTimeout(CliqzSecureMessage.trkTimer);
	    if(instantPush || CliqzSecureMessage.trk.length % 20 == 0){
	    	CliqzSecureMessage.pushTelemetry();
	    } else {
	    	CliqzSecureMessage.trkTimer = setTimeout(CliqzSecureMessage.pushTelemetry, 10000);
	    }
  	},
  	pushTelemetry: function() {
	    CliqzSecureMessage._telemetry_sending = CliqzSecureMessage.trk.splice(0);
	    CliqzSecureMessage.pushMessage = trkGen(CliqzSecureMessage._telemetry_sending);
	    let nextMsg = CliqzSecureMessage.nextMessage();
	    if (nextMsg) {
	      return sendM(nextMsg);
	    }
	    return Promise.resolve([]);
  	},
  	nextMessage: function() {
	    if(CliqzSecureMessage._telemetry_sending.length > 0) {
	      return CliqzSecureMessage._telemetry_sending[CliqzSecureMessage.pushMessage.next()["value"]];
	    }
  	},
    stats: function(proxyIP, statName, value){
    	CliqzUtils.log(`"${proxyIP}, ${statName},${value}"`);
    },
    saveLocalCheckTable: function(){
    	// This needs to persist the local temporary table on disk.
		if (Object.keys(CliqzSecureMessage.localTemporalUniq).length > 0) {
			CliqzSecureMessage.saveRecord('localTemporalUniq', JSON.stringify(CliqzSecureMessage.localTemporalUniq));
		}
    },
    saveLocalProxyList: function(){
    	// This needs to persist the local temporary table on disk.
		if (CliqzSecureMessage.proxyList && CliqzSecureMessage.proxyList.length > 0) {
			CliqzSecureMessage.saveRecord('proxylist', JSON.stringify(CliqzSecureMessage.proxyList));
		}
    },
    saveLocalRouteTable: function(){
    	// This needs to persist the local temporary table on disk.
		if (CliqzSecureMessage.routeTable && CliqzSecureMessage.routeTable.length > 0) {
			CliqzSecureMessage.saveRecord('routetable', JSON.stringify(CliqzSecureMessage.routeTable));
		}
    },
    saveRecord: function(id, data) {
    	CliqzChromeDB.set('hpn', id, data);
    },
    loadRecord: function(id){
    	var promise = new Promise(function(resolve, reject){
	        CliqzChromeDB.get('hpn', id, function(obj) {
	        	var res = [];
	            if (obj) res.push(obj);
	            resolve(res);
	        });
    	});
    	return promise;
    },
    loadLocalCheckTable: function(){
    	CliqzSecureMessage.loadRecord('localTemporalUniq')
    	.then( res => {
    		if(res.length > 0){
    			CliqzSecureMessage.localTemporalUniq = JSON.parse(res[0]);
    		}
    	})
    },
    loadLocalProxyList: function(){
    	CliqzSecureMessage.loadRecord('proxylist')
    	.then( res => {
    		if(res.length > 0){
    			CliqzSecureMessage.proxyList = JSON.parse(res[0]);
    		}
    	})
    },
    loadLocalRouteTable: function(){
    	CliqzSecureMessage.loadRecord('routetable')
    	.then( res => {
    		if(res.length > 0){
    			CliqzSecureMessage.routeTable = JSON.parse(res[0]);
    		}
    	})
    }
}
