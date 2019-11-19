import adblocker from '../../../platform/lib/adblocker';
import { extractHostname } from '../../../core/tlds';

export function mock() {
  const stats = { related: [], touched: [], tooltip: [], owned: [] };
  return {
    mock: true,
    stats: () => ({ ...stats }),
    statsCached: () => ({ ...stats }),
    invalidateCache: () => {},
  };
}

function match(patterns, url) {
  const request = adblocker.Request.fromRawDetails({ url, type: 'script' });
  return (patterns).reduce((acc, pattern) => {
    const filter = adblocker.NetworkFilter.parse(pattern);
    return acc || filter.match(request);
  }, false);
}

export function matchHostname(patterns = [], url = '') {
  const hostname = extractHostname(url);
  if (!hostname) { return false; }
  return match(patterns, hostname);
}

export function matchUrl(patterns = [], url = '') {
  return match(patterns, url);
}
