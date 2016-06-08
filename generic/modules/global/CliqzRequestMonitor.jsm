var EXPORTED_SYMBOLS = ["CliqzRequestMonitor"];

function CliqzRequestMonitor() {
  this._requests = [];
  this.TTL = 120000; // two minutes
  this.HEALTH_LEVEL = 0.8;
}

CliqzRequestMonitor.prototype = {
  requests: function () {
    var deadline = new Date() - this.TTL,
        reqs;

    // removing 'dead' requests
    while(this._requests[0] && this._requests[0].timestamp < deadline) {
      this._requests.shift();
    }

    // removing 'pending' requests
    reqs = this._requests.filter(function (req) {
      if(req.readyState === 4) { return req; }
    });

    return reqs;
  },

  // checks status codes of all requests in the registry and compare the
  // rate of successful ones to HEALTH LEVEL
  inHealth: function () {
    var reqs = this.requests(),
        health = reqs.filter(function (req) {
          return req.status === 200;
        }).length / reqs.length;

    return isNaN(health) || health >= this.HEALTH_LEVEL;
  },

  addRequest: function (req) {
    this._requests.push(req);
  },

};
