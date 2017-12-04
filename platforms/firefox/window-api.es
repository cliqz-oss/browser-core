import { Components, Services } from './globals';

const MAX_RECHECK_PERIOD = 503;
const MAX_TIMEOUT = 600011;
let hiddenWindowPromise = null;

function waitForHiddenWindow(resolve, reject) {
  let observer;
  let recheckPeriod = 5;
  let timeTotal = 0;
  let timer = Components.classes['@mozilla.org/timer;1']
    .createInstance(Components.interfaces.nsITimer);

  // Check if appShell.hiddenDOMWindow is available. If not,
  // schedule a next check after a short period (which increases
  // with every unsuccessful attempt, up to MAX_RECHECK_PERIOD).
  function checkHiddenWindow() {
    try {
      resolve(Services.appShell.hiddenDOMWindow);
      timer = null;
    } catch (e) {
      timeTotal += recheckPeriod;
      if (timeTotal >= MAX_TIMEOUT) {
        timer = null;
        reject(null);
        return;
      }
      recheckPeriod *= 2;
      timer.init(observer, recheckPeriod, timer.TYPE_ONE_SHOT);
      if (recheckPeriod > MAX_RECHECK_PERIOD) {
        recheckPeriod = MAX_RECHECK_PERIOD;
      }
    }
  }

  observer = {
    observe() {
      timer.cancel();
      checkHiddenWindow();
    }
  };

  checkHiddenWindow();
}

// In FF57 `appShell.hiddenDOMWindow` may not be immediatelly available,
// we should wait until it appears before using.
export default function () {
  if (!hiddenWindowPromise) {
    hiddenWindowPromise = new Promise(waitForHiddenWindow);
  }

  return hiddenWindowPromise;
}
