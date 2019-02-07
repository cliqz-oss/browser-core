import * as tldts from '../platform/lib/tldts';


const TLDTS_OPTIONS = {
  validHosts: [
    'localhost',
  ],
};


function parse(url) {
  const parsed = tldts.parse(url, TLDTS_OPTIONS);

  if (parsed.isIp) {
    parsed.domain = parsed.hostname;
  }

  return parsed;
}


function getGeneralDomain(url) {
  if (typeof url !== 'string') {
    return null;
  }

  return parse(url).domain;
}


function getPublicSuffix(url) {
  if (typeof url !== 'string') {
    return null;
  }

  return tldts.getPublicSuffix(url, TLDTS_OPTIONS);
}


function extractHostname(url) {
  if (typeof url !== 'string') {
    return null;
  }

  return tldts.getHostname(url);
}

function sameGeneralDomain(domain1, domain2) {
  if (domain1 === domain2) {
    return true;
  }

  if (typeof domain1 !== 'string' || typeof domain2 !== 'string') {
    return false;
  }

  return getGeneralDomain(domain1) === getGeneralDomain(domain2);
}


export {
  parse,
  getGeneralDomain,
  getPublicSuffix,
  extractHostname,
  sameGeneralDomain
};
