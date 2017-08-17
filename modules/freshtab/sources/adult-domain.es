import { BloomFilterUtils } from 'platform/bloom-filter-utils';
import console from 'core/console';

const ADULT_DOMAINS_BF_FILE_URI = 'chrome://cliqz/content/freshtab/adult-domains.bin';

export default class {
  constructor() {
    try {
      this.filter = BloomFilterUtils.loadFromInput(ADULT_DOMAINS_BF_FILE_URI, 'uri')[0];
    } catch (e) {
      console.log('Adult Domain List failed loading');
    }
  }
  isAdult(domain) {
    if (!this.filter) return false;
    return this.filter.test(domain);
  }
}
