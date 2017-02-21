

export default class RegexpCache {
  constructor(eventLoop) {
    this.eventLoop = eventLoop;

    this.compiledRegexp = {};
    this.compiledRegexpCount = 0;
  }


  // Add trigger to the cache.
  getRegexp(pattern) {
    var self = this;

    var re = self.compiledRegexp[pattern];
    if(!re) {
      re = new RegExp(pattern);
      if(self.compiledRegexpCount++ < 2500) {
        self.compiledRegexp[pattern] = re;
        self.compiledRegexpCount++;
      }
      else {
        self.compiledRegexpCount = {};
      }
    }

    return re;
  }

}
