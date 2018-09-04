/* eslint no-bitwise: 'off' */
/* eslint func-names: 'off' */
/* eslint no-param-reassign: 'off' */

import md5 from '../core/helpers/md5';
import BloomFilter from '../core/bloom-filter';
import config from '../core/config';

const CliqzBloomFilter = {
  VERSION: '0.1',
  debug: 'true',
  BLOOM_FILTER_CONFIG: `${config.settings.CDN_BASEURL}/bloom_filter`,
  hash(str) {
    return md5(str);
  },
  fnv32a(str) {
    const FNV1_32A_INIT = 0x811c9dc5;
    let hval = FNV1_32A_INIT;
    for (let i = 0; i < str.length; i += 1) {
      hval ^= str.charCodeAt(i);
      hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
    return hval >>> 0;
  },
  fnv32Hex(str) {
    return CliqzBloomFilter.fnv32a(str).toString(16);
  },
  BloomFilter
};

export default CliqzBloomFilter;
