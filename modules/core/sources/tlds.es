import tldjs from '../platform/lib/tldjs';


/**
 * Extrach the domain from an url, ignoring the schema and parameters.
 */
function extractHostname(url) {
  if (typeof url !== 'string') {
    return '';
  }

  let domain = url;

  // We need to check that the index is <= because this protocol could appear
  // as a value of a parameter in the URL.
  const indexOfProtocol = url.indexOf('://');
  if (indexOfProtocol !== -1 && indexOfProtocol <= 6) {
    domain = url.substr(indexOfProtocol + 3);
  }

  const indexOfSlash = domain.indexOf('/');
  if (indexOfSlash !== -1) {
    domain = domain.substr(0, indexOfSlash);
  }

  if (domain.startsWith('www.')) {
    domain = domain.substr(4);
  }

  if (domain.endsWith('.')) {
    domain = domain.substr(0, domain.length - 1);
  }

  return domain;
}


// Use our faster `extractHostname` implementation in tldjs
const tlds = tldjs.fromUserSettings({
  extractHostname,
  validHosts: [
    'localhost',
  ],
});


function parse(url) {
  const parsed = tlds.parse(url);

  if (parsed.isIp) {
    parsed.domain = parsed.hostname;
  }

  if (!parsed.domain && parsed.publicSuffix) {
    // Some hostname will not play well with the `getDomain` function if they
    // also constitute a valid public suffix (eg: googleapis.com)
    parsed.domain = parsed.publicSuffix;
  }

  return parsed;
}


function getGeneralDomain(url) {
  return parse(url).domain;
}


function getPublicSuffix(url) {
  return tlds.getPublicSuffix(url);
}


function sameGeneralDomain(domain1, domain2) {
  return domain1 === domain2 || getGeneralDomain(domain1) === getGeneralDomain(domain2);
}


export {
  parse,
  getGeneralDomain,
  getPublicSuffix,
  extractHostname,
  sameGeneralDomain
};
