import { getUrlVariations } from './url';
import { openedURLs } from '../platform/history/search';

export * from '../platform/tabs';

export function hasOpenedTabWithUrl(url, { strict = true } = {}) {
  if (strict) {
    return openedURLs.has(url);
  }
  return getUrlVariations(url).some(u => openedURLs.has(u));
}
