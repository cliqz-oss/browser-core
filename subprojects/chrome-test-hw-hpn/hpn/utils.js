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