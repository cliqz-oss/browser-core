import createSpananForModule from '../core/helpers/spanan-module-wrapper';
import checkIfChromeReady from '../core/content/ready-promise';

(async () => {
  await checkIfChromeReady();

  const humanWebWrapper = createSpananForModule('human-web');
  const humanWeb = humanWebWrapper.createProxy();

  const cb = document.getElementById('enableHumanWeb');
  const locale = document.getElementsByClassName('cliqz-locale');
  for (let i = 0; i < locale.length; i += 1) {
    const el = locale[i];
    el.textContent = chrome.i18n.getMessage(el.getAttribute('key'));
  }

  document.getElementById('enableHumanWeb').addEventListener('click', (ev) => {
    humanWeb.setStatus(!ev.target.checked);
  });

  humanWeb.getStatus().then((status) => {
    cb.checked = !status;
  });
})();
