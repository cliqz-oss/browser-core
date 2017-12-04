/* global window */

const isChromeReady = () => typeof chrome === 'object';

export default function () {
  let waitingInterval;

  return new Promise((resolve) => {
    const check = () => isChromeReady() && resolve();

    if (check()) {
      return;
    }

    waitingInterval = window.setInterval(check, 100);
  }).then(() => {
    window.clearInterval(waitingInterval);
  });
}
