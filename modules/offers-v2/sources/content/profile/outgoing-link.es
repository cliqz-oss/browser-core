import { isAmazonDomain, isEbayDomain } from '../utils';

export function classifyOutgoingLinks(document) {
  const cats = new Set();
  const links = document.querySelectorAll('a[href*=amazon i], a[href*=ebay i]');
  links.forEach((link) => {
    if (isAmazonDomain(link.hostname)) {
      cats.add('link-amazon');
    } else if (isEbayDomain(link.hostname)) {
      cats.add('link-ebay');
    }
  });
  return cats;
}

export function classifyByOutgoingLinks(window, chrome, CLIQZ) {
  if (window.parent !== window) {
    return;
  }

  const onDomContentLoaded = () => {
    const cats = classifyOutgoingLinks(window.document);
    cats.forEach(cat =>
      CLIQZ.app.modules['offers-v2'].action(
        'learnTargeting',
        'page-class',
        {
          feature: cat,
          url: window.document.location.href,
        }
      ));
  };

  window.addEventListener('DOMContentLoaded', onDomContentLoaded, { once: true });
}
