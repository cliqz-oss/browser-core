'use strict';
/*
 * This module is used for sending the events for purpose of human-web, anti-tracking via a secure channel.
*/

import messageContext from "hpn/message-context";
import { sendM } from "hpn/send-message";
import JsonFormatter,{ createHttpUrl, getRouteHash, _http, fetchSourceMapping, trkGen } from "hpn/utils";
import { overRideCliqzResults } from "hpn/http-handler-patch";
import userPK from "hpn/user-pk";
import CliqzHumanWeb from "human-web/human-web";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;


Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

// Import them in alphabetical order.
Services.scriptloader.loadSubScript('chrome://cliqz/content/hpn/content/extern/bigint.js');
Services.scriptloader.loadSubScript('chrome://cliqz/content/hpn/content/extern/crypto.js');
Services.scriptloader.loadSubScript('chrome://cliqz/content/hpn/content/extern/helperFunctions.js');
Services.scriptloader.loadSubScript('chrome://cliqz/content/hpn/content/extern/jsencrypt.js');
Services.scriptloader.loadSubScript('chrome://cliqz/content/hpn/content/extern/sha256.js');

/* Global variables
*/
var proxyCounter = 0;
// hpn-query pref is to encrypt queries
// hpn-telemetry is to encrypt telemetry data.
CliqzUtils.setPref('hpn-telemetry', CliqzUtils.getPref('hpn-telemetry', true));
CliqzUtils.setPref('hpn-query', CliqzUtils.getPref('hpn-query', false));

var CliqzSecureMessage = {
	VERSION: '0.1',
	LOG_KEY: 'securemessage',
	debug: false,
	counter: 0,
  httpHandler:_http,
  secureLogger: null,
  JSEncrypt: JSEncrypt,
  cryptoJS: CryptoJS,
  uPK : new userPK(),
  dsPK : null,
  routeTable : null,
  RSAKey: "",
  eventID:{},
  sourceMap:null,
  tmult: 4,
  tpace: 250,
  SOURCE_MAP_PROVIDER: "https://hpn-collector.cliqz.com/sourcemapjson?q=1",
  LOOKUP_TABLE_PROVIDER: "https://hpn-collector.cliqz.com/lookuptable?q=1",
  KEYS_PROVIDER: "https://hpn-collector.cliqz.com/signerKey?q=1",
  proxyList: null,
  proxyStats:{},
  PROXY_LIST_PROVIDER: "https://hpn-collector.cliqz.com/proxyList?q=1",
  BLIND_SIGNER:"https://hpn-sign.cliqz.com/sign",
  USER_REG:"https://hpn-sign.cliqz.com/register",
  signerKey: null,
  loggerKey: null,
  getRouteHash: getRouteHash,
  localTemporalUniq:null,
  pacemaker: function() {
  	if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % 10 == 0) {
  		if (CliqzSecureMessage.debug) {
  			CliqzUtils.log('Pacemaker: ' + CliqzSecureMessage.counter/CliqzSecureMessage.tmult , CliqzSecureMessage.LOG_KEY);
  		}

  	}

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

    //Fetch sourceMap
    if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % (60 * 3 * 1) == 0) {
    	if (CliqzSecureMessage.debug) {
    		CliqzUtils.log('Load proxy list', CliqzSecureMessage.LOG_KEY);
    	}
    	fetchSourceMapping();
    	CliqzSecureMessage.fetchProxyList();
      CliqzSecureMessage.fetchRouteTable();
      prunelocalTemporalUniq();

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
    	saveLocalCheckTable();
    	saveLocalProxyList();
    	saveLocalRouteTable();

      // Flush proxy stats
      CliqzSecureMessage.flushProxyStats();
    }

    CliqzSecureMessage.counter += 1;
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
    // ****************************
    // telemetry, PREFER NOT TO SHARE WITH CliqzUtils for safety, blatant rip-off though
    // ****************************
    trk: [],
    trkTimer: null,
    telemetry: function(msg, instantPush) {
      if (!CliqzSecureMessage || //might be called after the module gets unloaded
      	CliqzUtils.getPref('dnt', false) ||
      	CliqzUtils.isPrivate(CliqzUtils.getWindow())) return;

      	if (msg) CliqzSecureMessage.trk.push(msg);
      CliqzUtils.clearTimeout(CliqzSecureMessage.trkTimer);
      if(instantPush || CliqzSecureMessage.trk.length % 20 == 0){
      	CliqzSecureMessage.pushTelemetry();
      } else {
      	CliqzSecureMessage.trkTimer = CliqzUtils.setTimeout(CliqzSecureMessage.pushTelemetry, 10000);
      }
    },
    _telemetry_req: null,
    _telemetry_sending: [],
    telemetry_MAX_SIZE: 500,
    previousDataPost: null,
    pushMessage : [],
    sha1:null,
    routeHashTable:null,
    pacemakerId:null,
    queryProxyIP:null,
    performance:null,
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
    initAtWindow: function(window){
    	Services.scriptloader.loadSubScript('chrome://cliqz/content/hpn/content/extern/crypto-kjur.js', window);
    	CliqzSecureMessage.RSAKey = window.RSAKey;
    	CliqzSecureMessage.sha1 = window.CryptoJS.SHA1;
    	overRideCliqzResults();
    },
    init: function(){
    	// Doing it here, because this lib. uses navigator and window objects.
    	// Better method appriciated.

    	if (CliqzSecureMessage.pacemakerId==null) {
    		CliqzSecureMessage.pacemakerId = CliqzUtils.setInterval(CliqzSecureMessage.pacemaker, CliqzSecureMessage.tpace, null);
    	}
      if(!CliqzSecureMessage.dbConn) CliqzSecureMessage.initDB();

    	CliqzSecureMessage.fetchRouteTable();
    	CliqzSecureMessage.fetchProxyList();
    	fetchSourceMapping();

    	if(!CliqzSecureMessage.localTemporalUniq) loadLocalCheckTable();


    	// Backup if we were not able to load from the webservice, pick the last one.
    	if(!CliqzSecureMessage.proxyList) loadLocalProxyList();
    	if(!CliqzSecureMessage.routeTable) loadLocalRouteTable();
    },
    initDB: function() {
    	if ( FileUtils.getFile("ProfD", ["cliqz.dbhumanweb"]).exists() ) {
    		if (CliqzSecureMessage.dbConn==null) {
    			CliqzSecureMessage.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbhumanweb"]))
    		}
    		createTable();
    		return;
    	}
    	else {
    		CliqzSecureMessage.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbhumanweb"]));
    		createTable();
    	}

    },
    unload: function(){
    	saveLocalCheckTable();
      CliqzSecureMessage.pushTelemetry();
    	CliqzUtils.clearTimeout(CliqzSecureMessage.pacemakerId);
    },
    dbConn: null,
    proxyIP: function (){
      if(!CliqzSecureMessage.proxyList) return;

    	if(proxyCounter >= CliqzSecureMessage.proxyList.length) proxyCounter = 0;
    	var url = createHttpUrl(CliqzSecureMessage.proxyList[proxyCounter]);
      CliqzSecureMessage.queryProxyIP = url;
      proxyCounter += 1;
    },
    stats: function(proxyIP, statName, value){
    	try{
    		if(CliqzSecureMessage.proxyStats && CliqzSecureMessage.proxyStats[proxyIP]){
    			if(CliqzSecureMessage.proxyStats[proxyIP][statName]) {
    				if(statName == "latency"){
    					CliqzSecureMessage.proxyStats[proxyIP][statName].push(value);
    				}else{
    					CliqzSecureMessage.proxyStats[proxyIP][statName] += value
    				}
    			}else{
    				if(statName == "latency"){
    					CliqzSecureMessage.proxyStats[proxyIP][statName] = [value];
    				}else{
    					CliqzSecureMessage.proxyStats[proxyIP][statName] = value;
    				}
    			}
    		}
    		else{
    			if(statName == "latency"){
    				var stats = {};
    				stats[statName] = [value];
    				CliqzSecureMessage.proxyStats[proxyIP] = stats;
    			}
    			else{
    				var stats = {};
    				stats[statName] = value;
    				CliqzSecureMessage.proxyStats[proxyIP] = stats;
    			}
    		}
    	}
    	catch(e){}
    },
    flushProxyStats: function(){
    	var proxyStats = CliqzSecureMessage.proxyStats;
    	if(Object.keys(proxyStats).length == 0) return;
    	// var msg = {"action": "proxy-health", "anti-duplicates":Math.floor(Math.random() * 10000000),"type": "cliqz", "ver": "1.5", "payload": proxyStats,"ts": CliqzUtils.getPref('config_ts', null)};
    	// CliqzSecureMessage.telemetry(msg);
    	CliqzSecureMessage.proxyStats = {};
    	return;
    }
  }

function createTable(){
	var localcheck = "create table if not exists localcheck(\
		id VARCHAR(24) PRIMARY KEY NOT NULL,\
		data VARCHAR(1000000) \
		)";

  (CliqzSecureMessage.dbConn.executeSimpleSQLAsync || CliqzSecureMessage.dbConn.executeSimpleSQL)(localcheck);

}

export function saveLocalCheckTable() {
	if (CliqzSecureMessage.localTemporalUniq) {
    CliqzUtils.log("Saving local table");
		saveRecord('localTemporalUniq', JSON.stringify(CliqzSecureMessage.localTemporalUniq));
	}
}

function saveLocalProxyList() {
	if (CliqzSecureMessage.proxyList) {
		saveRecord('proxylist', JSON.stringify(CliqzSecureMessage.proxyList));
	}
}

function saveLocalRouteTable() {
	if (CliqzSecureMessage.routeTable) {
		saveRecord('routetable', JSON.stringify(CliqzSecureMessage.routeTable));
	}
}

function loadLocalProxyList() {
	loadRecord('proxylist', function(data) {
		if (data==null) {
			if (CliqzSecureMessage.debug) CliqzUtils.log("There was no data on proxy list", CliqzSecureMessage.LOG_KEY);
			CliqzSecureMessage.proxyList = null;
		}
		else {
			try {
				CliqzSecureMessage.proxyList = JSON.parse(data);
			} catch(ee) {
				CliqzSecureMessage.proxyList = null;
			}
		}
	});
}

function loadLocalRouteTable() {
	loadRecord('routetable', function(data) {
		if (data==null) {
			if (CliqzSecureMessage.debug) CliqzUtils.log("There was no data on route table", CliqzSecureMessage.LOG_KEY);
			CliqzSecureMessage.routeTable = null;
		}
		else {
			try {
				CliqzSecureMessage.routeTable = JSON.parse(data);
			} catch(ee) {
				CliqzSecureMessage.routeTable = null;
			}
		}
	});
}

function loadLocalCheckTable() {
	loadRecord('localTemporalUniq', function(data) {
		if (data==null) {
			if (CliqzSecureMessage.debug) CliqzUtils.log("There was no data on action stats", CliqzSecureMessage.LOG_KEY);
			CliqzSecureMessage.localTemporalUniq = {};
		}
		else {
			try {
				CliqzSecureMessage.localTemporalUniq = JSON.parse(data);
			} catch(ee) {
        CliqzUtils.log("Loading local uniq: " + ee,CliqzSecureMessage.LOG_KEY);
				CliqzSecureMessage.localTemporalUniq = {};
			}
		}
	});
}

function saveRecord(id, data) {
	if(!(CliqzSecureMessage.dbConn)) return;
	var st = CliqzSecureMessage.dbConn.createStatement("INSERT OR REPLACE INTO localcheck (id,data) VALUES (:id, :data)");
	st.params.id = id;
	st.params.data = data;

	st.executeAsync({
		handleError: function(aError) {
			if(CliqzSecureMessage && CliqzSecureMessage.debug){
				if (CliqzSecureMessage.debug) CliqzUtils.log("SQL error: " + aError.message, CliqzSecureMessage.LOG_KEY);
			}
		},
		handleCompletion: function(aReason) {
			if(CliqzSecureMessage && CliqzSecureMessage.debug){
				if (CliqzSecureMessage.debug) CliqzUtils.log("Insertion success", CliqzSecureMessage.LOG_KEY);
			}
		}
	});
}

function loadRecord(id, callback){
	var stmt = CliqzSecureMessage.dbConn.createAsyncStatement("SELECT id, data FROM localcheck WHERE id = :id;");
	stmt.params.id = id;

	var fres = null;
	var res = [];
	stmt.executeAsync({
		handleResult: function(aResultSet) {
			if(!(CliqzSecureMessage)) return;
			for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
				if (row.getResultByName("id")==id) {
					res.push(row.getResultByName("data"));
				}
				else {
					if (CliqzSecureMessage.debug) CliqzUtils.log("There are more than one record", CliqzSecureMessage.LOG_KEY);
					callback(null);
				}
				break;
			}
		},
		handleError: function(aError) {
			if(!(CliqzSecureMessage)) return;
			if (CliqzSecureMessage.debug) CliqzUtils.log("SQL error: " + aError.message, CliqzSecureMessage.LOG_KEY);
			callback(null);
		},
		handleCompletion: function(aReason) {
			if(!(CliqzSecureMessage)) return;
			if (res.length == 1) callback(res[0]);
			else callback(null);
		}
	});
}

function prunelocalTemporalUniq(){
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
    CliqzUtils.log("Pruned local temp queue: " + pi + "items", CliqzSecureMessage.LOG_KEY);
    if(CliqzHumanWeb.actionStats) CliqzHumanWeb.actionStats['itemsLocalValidation'] = Object.keys(CliqzSecureMessage.localTemporalUniq).length;
  }
}

export default CliqzSecureMessage;
