import config from '../core/config';
import { Resource } from '../core/resource-loader';

export function ipv4ToBinaryString(ip) {
  if (!ip) {
    throw new Error('ip cannot be falsy');
  }
  const ipParts = ip.split('.')
    .map(n => parseInt(n, 10));
  if (ipParts.some(n => isNaN(n))) {
    throw new Error('ip must contain only numbers');
  }
  return ipParts
    .map(n => n.toString(2))
    .map(bs => Array(9 - bs.length).join('0') + bs)
    .join('');
}

export default class GeoIp {
  constructor() {
    this._tree = [null, null];
    this._countries = [];
    this._loader = new Resource(
      ['antitracking', 'ipv4_btree.json'],
      {
        remoteURL: `${config.settings.CDN_BASEURL}/anti-tracking/geoip/ipv4_btree_20180206.json.gz`,
        remoteOnly: true,
      }
    );
  }

  load() {
    return this._loader.load().then((data) => {
      this._tree = data.tree;
      this._countries = data.countries;
    });
  }

  lookup(ip) {
    const binAddr = ipv4ToBinaryString(ip);
    // traverse binary tree to find country code
    let n = this._tree;
    for (let i = 0; i < 32; i += 1) {
      // binAddr[i] can be '0' or '1', which can also be used to index an array
      // a node is either a two element array, a country code string, or null.
      n = n[binAddr[i]];
      if (n === null) {
        return null;
      } else if (typeof n === 'number') {
        return this._countries[n];
      }
    }
    return null;
  }
}
