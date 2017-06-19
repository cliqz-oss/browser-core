import * as psl from '../platform/public-suffix-list';
// Functions for manipulating domain names

export function getGeneralDomain(domain) {
  try {
    return psl.getGeneralDomain(domain);
  } catch(e) {
    // invalid hostname
    return '';
  }
}

export function sameGeneralDomain(dom1, dom2) {
  // getGeneralDomain may throw an exception if domain is invalid
  try {
    return dom1 === dom2 || psl.getGeneralDomain(dom1) === psl.getGeneralDomain(dom2);
  } catch(e) {
    return false;
  }
};

export function isIpv4Address(domain) {
  const digits = domain.split('.');
  return digits.length === 4 && digits.map(Number).every(function(d) {
    return d >= 0 && d < 256;
  });
}
