import psl from '../core/tlds';
import * as url from '../core/url';
// Functions for manipulating domain names


export function sameGeneralDomain(dom1, dom2) {
  // getGeneralDomain may throw an exception if domain is invalid
  try {
    return dom1 === dom2 || psl.getGeneralDomain(dom1) === psl.getGeneralDomain(dom2);
  } catch (e) {
    return false;
  }
}


export const getGeneralDomain = psl.getGeneralDomain;
export const isIpv4Address = url.isIpv4Address;
