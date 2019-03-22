import { registerContentScript } from '../core/content/helpers';

registerContentScript('onboarding-v3', 'http*://cliqz.com/*', (window, chrome, CLIQZ) => {
  CLIQZ.app.modules['core-cliqz'].action('getSupportInfo')
    .then((info) => {
      if (localStorage) {
        localStorage.setItem('extension-info', JSON.stringify(info));
      }
    });
});
