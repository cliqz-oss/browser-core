/* global window, $ */
import send from './content/transport';
import draw from './content/view';

// ====== ON LOAD ====== //
$(() => send('getEmptyFrameAndData'));

window.addEventListener('message', (ev) => {
  const { target = '', origin = '', message = {} } = JSON.parse(ev.data);
  if (target !== 'cliqz-offers-cc' || origin !== 'window') { return; }
  const { action = '', data = {} } = message;
  if (action === 'pushData') { draw(data); }
});
