

export default class RegexpCache {
  constructor() {
    this.compiledRegexp = {};
    this.compiledRegexpCount = 0;
  }


  // Add trigger to the cache.
  getRegexp(pattern) {
    var self = this;

    var re = self.compiledRegexp[pattern];
    if (re) {
      return re;
    }

    try {
      re = new RegExp(pattern);
    } catch (e) {
      re = null;
    }
    if(self.compiledRegexpCount > 2500) {
      // reset cache completely.... TODO: improve this
      self.compiledRegexp = {};
      self.compiledRegexpCount = 0;
    }
    self.compiledRegexp[pattern] = re;
    self.compiledRegexpCount++;

    return re;
  }

}
