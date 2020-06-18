//
// Amazon has a lot of domains, some of them are:
// 'amazon.com.au', 'amazon.de', 'amazon.co.uk', 'amazon.com'
//
const reAmazon = /(^|\.)amazon\..{2,6}$/i;
export function isAmazonDomain(domain) {
  return reAmazon.test(domain);
}

const reEbay = /(^|\.)ebay\..{2,6}$/i;
export function isEbayDomain(domain) {
  return reEbay.test(domain);
}

/**
 * @param {string} url
 * @returns {string} the given url stripped of its hash.
 */
export const stripUrlHash = (url) => {
  const indexOfHash = url.indexOf('#');
  return indexOfHash < 0 ? url : url.slice(0, indexOfHash);
};

/**
 * call a given function on `DOMContentLoaded` event,
 * and resolve to the resolved return value from that call.
 * @template T
 * @param {() => T|Promise<T>} fn
 * @return {Promise<T>}
 */
export const callWhenDOMContentLoaded = fn => new Promise(resolve =>
  window.addEventListener(
    'DOMContentLoaded',
    async () => {
      try {
        await fn();
      } catch (ex) {
        /* ignore */
      } finally {
        resolve();
      }
    },
    { once: true }
  ));
