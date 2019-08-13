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
