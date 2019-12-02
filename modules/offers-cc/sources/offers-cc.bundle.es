import send from './content/transport';

// ====== ON LOAD ====== //
send('getEmptyFrameAndData');

window.addEventListener('message', (ev) => {
  const { target = '', origin = '', message = {} } = JSON.parse(ev.data);
  if (target !== 'cliqz-offers-cc' || origin !== 'window') { return; }
  const { action = '', data = {} } = message;
  if (action !== 'pushData') { return; }
  if (window.document && window.document.readyState !== 'loading') {
    window.__globals_draw(data);
  } else {
    window.addEventListener('DOMContentLoaded', () => window.__globals_draw(data));
  }
});
