import ResourceLoader from 'core/resource-loader';

export function HashProb() {
    this.probHashLogM = null;
    this.probHashThreshold = null;
    this.probHashChars = {};
    'abcdefghijklmnopqrstuvwxyz1234567890.- '.split('').forEach(function(e, idx) {
        this.probHashChars[e] = idx;
    }.bind(this));

    this.probLoader = new ResourceLoader(['antitracking', 'prob.json'], {
        remoteURL: 'https://cdn.cliqz.com/anti-tracking/prob.json',
        cron: 24 * 60 * 60 * 1000  // daily
    });

    this.probLoader.load().then(function(data) {
        this.probHashLogM = data.logM;
        this.probHashThreshold = data.thresh;
    }.bind(this));
    this.probLoader.onUpdate(function(data) {
        this.probHashLogM = data.logM;
        this.probHashThreshold = data.thresh;
    }.bind(this));
}

HashProb.prototype.isHashProb = function(str) {
    var logProb = 0.0;
    var transC = 0;
    str = str.toLowerCase().replace(/[^a-z0-9\.\- ]/g,'');
    for(var i=0;i<str.length-1;i++) {
        var pos1 = this.probHashChars[str[i]];
        var pos2 = this.probHashChars[str[i+1]];

        logProb += this.probHashLogM[pos1][pos2];
        transC += 1;
    }
    if (transC > 0) {
        return Math.exp(logProb/transC);
    }
    else {
        return Math.exp(logProb);
    }
};

HashProb.prototype.isHash = function(str) {
    var p = this.isHashProb(str);
    return (p < this.probHashThreshold);
};