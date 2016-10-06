/*
Function to clean string for calculating route hash
*/
var punctuation = '!"\'()*,-./:;?[\\]^_`{|}~%$=&+#'
var regex =  new RegExp("[" + punctuation + "]","g");
function cleanStr(s){
  // Replace all spaces

  // Because in some telemetry message we only create uniqu based on anti-duplicate.
  // Anti-duplicate is not a string, hence converting it to string.
  s = '' + s;

  // Decode uri component
  // Need to find lua equivalent

  try{
    s = decodeURIComponent(s);
  }catch(e){};


  s = s.replace(/\s+/g,'');

  // Convert to lower
  s = s.toLowerCase();

  // Trim
  s = s.trim();

  // Clean the URL
  s = s.replace(/^http:\/\//, "");
  s = s.replace(/^https:\/\//, "");
  s = s.replace(/^www\./,'');


  // Remove all punctuation marks
  s = s.replace(regex,'');

  return s;

}

function _http(url){

	var core = {

    // Method that performs request
    req : function (method, url, data, type) {
	      // Creating a promise
	      var promise = new Promise( function (resolve, reject) {

        // Instantiates the XMLHttpRequest
        var client = new XMLHttpRequest();
        var uri = url;
        var ts = new Date().getTime();

        client.open(method, uri, true);
        client.setRequestHeader("x-type", type ? type : "delayed");
        client.overrideMimeType('application/json');
        //client.setRequestHeader("Content-Type", "application/json;charset=utf-8");
        client.send(data);

        client.onload = function () {
        	var statusClass = parseInt(client.status / 100);
        	var te = new Date().getTime();
          // CliqzUtils.log("Time taken2: " + CliqzSecureMessage.performance.getEntriesByName("lat"),CliqzSecureMessage.LOG_KEY);

          if(statusClass == 2 || statusClass == 3 || statusClass == 0 /* local files */){
            // Performs the function "resolve" when this.status is equal to 2xx
            resolve(this.response);
          } else {
            reject(this.statusText);
          }
        };
        client.onerror = function (e) {
          console.log(e);
        	reject(this.statusText);
        };
        client.ontimeout = function(){
        	reject(this.statusText);
        };
      });

      // Return the promise
      return promise;
    }
  };


  return {
  	'get' : function(args) {
  		return core.req('GET', url, args);
  	},
  	'post' : function(args, type) {
  		return core.req('POST', url, args, type);
  	}
  };
}

function fetchSourceMapping(){
  // This will fetch the route table from local file, will move it to webservice later.
    //Check health
    CliqzUtils.httpGet(CliqzSecureMessage.SOURCE_MAP_PROVIDER,
      function success(req){
        try {
          CliqzSecureMessage.sourceMap = JSON.parse(req.response);
        } catch(e){}
      },
      function error(res){
        CliqzUtils.log('Error loading config. ', CliqzSecureMessage.LOG_KEY);
      }, 5000);
}

function getField(obj, path) {
  return path.split(/[\.\[\]]+/).filter(x => x).reduce((o, i) => o[i], obj);
}

function orderedStringify(t, res, onlyKeys) {
  if (!t || typeof t !== 'object') {
    if (t === undefined) {
      throw 'Found undefined field when trying to calculate msg routehash';
    }
    res.push(cleanStr(t));
  } else {
    let keys = Object.keys(t);
    keys.sort();
    let isArray = Array.isArray(t);
    keys.forEach(k => {
      if (!isArray) {
        res.push(cleanStr(k));
      }
      if (!onlyKeys) {
        orderedStringify(t[k], res);
      }
    });
  }
}


function getRouteHashStr(obj, sourceMap) {
  let action = obj.action;
  let keys = sourceMap[action].keys;
  let staticKeys = sourceMap[action].static||[];
  let res = [];
  keys.forEach(k => orderedStringify(getField(obj, k), res, staticKeys.some(sk => k.endsWith(sk))));
  return res.join('');
}

/* This method will return the string based on mapping of which keys to use to hash for routing.
*/
function getRouteHash(msg){
  return getRouteHashStr(msg, CliqzSecureMessage.sourceMap);
}
/*
Function to create http url
*/

function createHttpUrl(host){
  return "http://" + host + "/verify";
}

/*
Converts given array to generator like object.
*/
function trkGen(trk) {
  var trk = trk;
  var idx = -1;
  return {
    next: function() {
      idx += 1
      if(idx < trk.length){
        return{
        value: idx, // Return the first yielded value.
        done: false
      }
    }
    else{
      return{
        value: undefined, // Return undefined.
        done: true
      }
    }
  }
  }
}


function getProxyIP(){
  var pIP = CliqzSecureMessage.proxyList[Math.floor(Math.random() * CliqzSecureMessage.proxyList.length)];
  return `http://${pIP}/verify`;
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}