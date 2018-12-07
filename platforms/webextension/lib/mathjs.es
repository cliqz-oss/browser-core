/* global math */
import { window } from '../globals';
import { getResourceUrl } from '../platform';

// eslint-disable-next-line
export default new Proxy(function () {}, {
  get: (target, prop) => {
    if (math) {
      return math[prop];
    }
    return null;
  },
});

export function load() {
  if (typeof math !== 'undefined') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = window.document.createElement('script');
    script.src = getResourceUrl('vendor/math.min.js');
    script.onload = resolve;
    script.onerror = reject;
    window.document.body.appendChild(script);
  });
}
window.loadX = load;
