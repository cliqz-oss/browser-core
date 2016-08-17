import MapCache from 'antitracking/fixed-size-cache';
import md5 from 'core/helpers/md5'

var md5Cache = new MapCache(md5, 1000);

export default function(s) {
    if (!s) return "";
    return md5Cache.get(s);
}
