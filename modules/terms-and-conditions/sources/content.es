/*
 * This file will detect terms and conditions on all google domains and measures
 * how long the user interacts with it (in ms).
 *
 * In both mobile and desktop it seems that (at least in google's serp page)
 * terms and conditions are always shown on consent.google.com. On desktop this
 * is done via an iframe, whereas on mobile it redirects you there.
 *
 * This content script measures how long users spend on this google domain,
 * which is assumed to be a good proxy for how long it takes for giving
 * consent
 */

import { registerContentScript } from '../core/content/helpers';

registerContentScript(
  'terms-and-conditions',
  'https://consent.google.com/*',
  (window, chrome, CLIQZ) => {
    function notifyBackgroundPage(message) {
      CLIQZ.app.modules['terms-and-conditions'].action('report', message);
    }

    function measureDurationToConsent() {
      const start = Date.now();
      window.addEventListener('beforeunload', () => {
        notifyBackgroundPage({ duration: Date.now() - start });
      });
    }

    measureDurationToConsent();
  }
);
