import { URLInfo } from '../antitracking/url';
import { getGeneralDomain } from '../antitracking/domain';


export function extractDomain(url) {
  if (!url) {
    return null;
  }

  const urlParts = URLInfo.get(url);

  if (!urlParts) {
    return null;
  }

  return urlParts.hostname;
}


export function extractGeneralDomain(url) {
  let hostname = extractDomain(url);

  if (hostname) {
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return getGeneralDomain(hostname);
  }

  return null;
}


export function sanitiseUrl(url) {
  if (!url) return url;

  // It can be an Ad id instead of a URL.
  if (url.indexOf('/') === -1) return url;

  const urlParts = URLInfo.get(url);
  const secondSlash = urlParts.path.indexOf('/', 2);
  const truncatedPath = urlParts.path.substring(0, secondSlash > 0 ? secondSlash : undefined);
  return `//${urlParts.hostname}${truncatedPath}`;
}


export function sanitiseParents(parents) {
  if (!parents) {
    return parents;
  }

  return parents.map(parent => ({
    id: parent.id,
    url: sanitiseUrl(parent.url),
  }));
}
