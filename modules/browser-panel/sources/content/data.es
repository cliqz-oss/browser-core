/* global window, draw */

// iframe to browser window
export function sendMessageToWindow(message) {
  const searchParams = new URLSearchParams(window.location.search);
  const isCrossOrigin = searchParams.get('cross-origin') !== null;
  const target = isCrossOrigin ? window.parent : window;
  target.postMessage(JSON.stringify({
    target: 'cqz-browser-panel-re',
    origin: 'iframe',
    message
  }), '*');
}

// browser window to iframe
export function messageHandler(message) {
  switch (message.action) {
    case 'render_template': {
      draw(message.data);
      break;
    }
    default:
      break;
  }
}

window.addEventListener('message', (ev) => {
  const data = JSON.parse(ev.data);
  if (data.target === 'cqz-browser-panel-re'
     && data.origin === 'window') {
    messageHandler(data.message);
  }
});
