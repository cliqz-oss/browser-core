import { processRawRequest } from '../../core/adblocker-base/filters-engine';


/**
 * this method will generate the proper structure we need to use when matching
 * later against the patterns. This will build the "tokenizedURL object"
 * @param  {[type]} url [description]
 * @return {Object}     will be the object needed to parse later
 */
export default function tokenizeUrl(url) {
  return url ? processRawRequest({ url, sourceUrl: '', cpt: 2 }) : null;
}
