import MapCache from 'antitracking/fixed-size-cache';
import CliqzHumanWeb from 'human-web/human-web';

var md5Cache = new MapCache(CliqzHumanWeb._md5, 1000);

export default function(s) {
    if (!s) return "";
    return md5Cache.get(s);
}
