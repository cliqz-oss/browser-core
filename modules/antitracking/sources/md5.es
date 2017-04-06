import MapCache from './fixed-size-cache';
import coreMd5 from '../core/helpers/md5'

const md5 = typeof crypto !== 'undefined' && crypto.md5 ? crypto.md5 : coreMd5;

var md5Cache = new MapCache(md5, 1000);

export default function(s) {
    if (!s) return "";
    return md5Cache.get(s);
}
