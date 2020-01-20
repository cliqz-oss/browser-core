import send from './content/transport';
import draw from './content/view';

// ====== ON LOAD ====== //
window.document.addEventListener('DOMContentLoaded', () => send('getEmptyFrameAndData'));

window.addEventListener('message', (ev) => {
  const { target = '', origin = '', message = {} } = JSON.parse(ev.data);
  if (target !== 'cliqz-offers-reminder' || origin !== 'window') { return; }
  const { action = '', data = {} } = message;
  if (action !== 'pushData') { return; }
  if (window.document && window.document.readyState !== 'loading') {
    draw(data);
  } else {
    window.addEventListener('DOMContentLoaded', () => draw(data));
  }
});
