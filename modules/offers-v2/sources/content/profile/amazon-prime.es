import { isAmazonDomain } from '../utils';

function isPrimeHtml(document) {
  const links = [...document.getElementsByTagName('a')];
  return links.some(a => a.href && a.href.endsWith('/ref=nav_logo_prime'));
}

function amazonPrimeDetection(window, chrome, CLIQZ) {
  if (window.parent !== window) {
    return;
  }
  if (!isAmazonDomain(window.location.hostname)) {
    return;
  }

  const onDomContentLoaded = () => {
    if (isPrimeHtml(window.document)) {
      CLIQZ.app.modules['offers-v2'].action(
        'learnTargeting', 'AmazonPrime'
      );
    }
  };

  window.addEventListener('DOMContentLoaded', onDomContentLoaded, { once: true });
}

export default amazonPrimeDetection;
