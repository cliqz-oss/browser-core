/* global window, document, draw */

// iframe to browser window
export function sendMessageToWindow(message) {
  window.postMessage(JSON.stringify({
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
  // console.log(`data: ${JSON.stringify(ev)}`);
  if (data.target === 'cqz-browser-panel-re' &&
     data.origin === 'window') {
    messageHandler(data.message);
  }
});
