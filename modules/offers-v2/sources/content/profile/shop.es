const reShop = /\bshop\b/i;
const reCart = /\bcart\b/i;
const reBasket = /\bbasket\b/i;
const reWarenkorb = /\bwarenkorb\b/i;

function hasWordShopInTitle(document) {
  return reShop.test(document.title);
}

function hasClassCart(document) {
  const classed = document.querySelectorAll('*[class*=cart i], *[class*=basket i]');
  for (const node of classed) {
    const className = node.className;
    if (reCart.test(className) || reBasket.test(className)) {
      return true;
    }
  }
  return false;
}

function hasKeywordInIconProperties(document) {
  const images = document.querySelectorAll(`
    img[src*="cart" i],
    img[src*="warenkorb" i],
    img[title*="cart" i],
    img[title*="warenkorb" i],
    img[alt*="cart" i],
    img[alt*="warenkorb" i]
   `);
  for (const img of images) {
    for (const re of [reCart, reWarenkorb]) {
      for (const attr of [img.src, img.title, img.alt]) {
        if (re.test(attr)) {
          return true;
        }
      }
    }
  }
  return false;
}

// ebay, zalando: detected by `user-journey/features/new-page`.

export function isShopPage(document) {
  return hasWordShopInTitle(document)
    || hasClassCart(document)
    || hasKeywordInIconProperties(document);
}

export function shopPageDetection(window, chrome, CLIQZ) {
  if (window.parent !== window) {
    return;
  }

  const onDomContentLoaded = () => {
    if (isShopPage(window.document)) {
      CLIQZ.app.modules['offers-v2'].action(
        'learnTargeting',
        'page-class',
        {
          feature: 'shop',
          url: window.document.location.href,
          referrer: window.document.referrer
        }
      );
    }
  };

  window.addEventListener('DOMContentLoaded', onDomContentLoaded, { once: true });
}
