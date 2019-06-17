import {
  registerContentScript,
} from '../core/content/helpers';
import config from '../core/config';
import { setTimeout } from '../core/timers';

registerContentScript('insights', 'http*', (window, chrome, CLIQZ) => {
  if (config.platform !== 'firefox' && !CLIQZ.app.modules.insights.isEnabled) {
    return;
  }
  // only run in main document
  if (window.self !== window.top) {
    return;
  }

  function analyzePageInfo() {
    const { host, hostname, pathname, protocol } = document.location;
    const pTime = (performance.timing.domContentLoadedEventStart - performance.timing.requestStart);
    const pageLatency = pTime || 0;

    CLIQZ.app.modules.insights.action('recordPageInfo', {
      domain: `${protocol}//${host}${pathname}`,
      host: hostname,
      timestamp: performance.timing.navigationStart,
      latency: pageLatency,
      pageTiming: {
        timing: {
          navigationStart: performance.timing.navigationStart,
          loadEventEnd: performance.timing.loadEventEnd
        }
      }
    });
  }

  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => {
      setTimeout(analyzePageInfo, 1);
    });
  } else {
    analyzePageInfo();
  }
});
