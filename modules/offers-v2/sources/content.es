import { registerContentScript } from '../core/content/register';
import config from '../core/config';
import couponsHandlingScript from './content/coupon/script';
import amazonPrimeDetection from './content/profile/amazon-prime';
import { serpPageDetection } from './content/profile/serp';
import { shopPageDetection } from './content/profile/shop';
import { classifyByOutgoingLinks } from './content/profile/outgoing-link';
import { getPurchaseButtons } from './content/coupon/utils';
import removeUnselectedOnboardingOffers from './content/onboarding-selection';
import { stripUrlHash } from './content/utils';

const CHIP_OFFERS_CHANNEL = 'chip';

function logPurchaseButtonScript(window, chrome, CLIQZ) {
  if (window.parent !== window) {
    return;
  }

  const backgroundAction = (action, ...args) =>
    CLIQZ.app.modules['offers-v2'].action(action, ...args);

  const onBuyButtonClicked = () => {
    backgroundAction('onContentSignal', { action: 'purchase', state: 'attempted' });
  };

  const onLoad = () => {
    // Check if there is a purchase button
    // TODO: This does not work with dynamic page content yet
    const buyButtons = getPurchaseButtons(window);
    // Do nothing if this page is full of buy buttons
    if (buyButtons.length > 5) {
      // Todo: add a different signal to this action
      return;
    }
    if (buyButtons.length > 0) {
      buyButtons.forEach((button) => {
        button.addEventListener('click', onBuyButtonClicked);
      });
    }
  };

  const onUnload = () => {
    window.removeEventListener('unload', onUnload);
    window.removeEventListener('load', onLoad);
  };

  window.addEventListener('load', onLoad);
  window.addEventListener('unload', onUnload);
}

registerContentScript({
  module: 'offers-v2',
  matches: [
    'https://*/*',
    'http://*/*',
  ],
  js: [
    logPurchaseButtonScript,
    couponsHandlingScript,
    // Optional scripts enabled by 'user-journey'
    ...(
      config.settings['offers.user-journey.enabled']
        ? [
          serpPageDetection,
          shopPageDetection,
          classifyByOutgoingLinks,
        ] : []
    ),
  ],
});

registerContentScript({
  module: 'offers-v2',
  // NOTE: here we do not pre-filter for likely amazon domains as there is no
  // easy way to do this in a robust way with the match pattern syntax. But this
  // should not have any performance impact because `amazonPrimeDetection`
  // already performs a quick check before doing anything else.
  matches: ['https://*/*'],
  js: [amazonPrimeDetection],
});

const isChipChannel = config.settings?.OFFERS_CHANNEL === CHIP_OFFERS_CHANNEL;
const CHIP_ONBOARDING_URL = isChipChannel && config.settings?.ONBOARDING_URL;
if (CHIP_ONBOARDING_URL) {
  registerContentScript({
    module: 'offers-v2',
    matches: [`${stripUrlHash(CHIP_ONBOARDING_URL)}*`],
    js: [removeUnselectedOnboardingOffers]
  });
}
