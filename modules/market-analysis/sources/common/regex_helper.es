/**
 * Class for testing a regular expression string on an url
 * regexes are also cached
 */
import LRU from '../../core/LRU';

class RegexHelper {
  constructor() {
    // mapping from regexString to (compiled) RegEx object of that regexString
    this.cachedRegExps = new LRU(200);
  }

  /**
   * test a regular expression string on a given url
   * @param  {String} regexStr
   * @param  {String} url
   * @return {Boolean} match oor not
   */
  test(regexStr, url) {
    let regex = this.cachedRegExps.get(regexStr);
    if (!(regex)) {
      // cache missed
      regex = new RegExp(regexStr);
      this.cachedRegExps.set(regexStr, regex);
    }
    return regex.test(url);
  }
}

export default RegexHelper;
