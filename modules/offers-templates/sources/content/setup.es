import send from './transport';

export default function setup(draw) {
  send('getEmptyFrameAndData');

  window.addEventListener('message', (ev) => {
    const { target = '', origin = '', message = {} } = JSON.parse(ev.data);
    if (target !== 'cliqz-offers-templates' || origin !== 'window') { return; }
    const { action = '', data = {} } = message;
    if (action !== 'pushData') { return; }
    if (window.document && window.document.readyState !== 'loading') {
      (draw || window.__globals_draw)(data);
    } else {
      window.addEventListener('DOMContentLoaded',
        () => (draw || window.__globals_draw)(data));
    }
  });
}
