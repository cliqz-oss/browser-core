/* global window, document, draw */

export function sendMessageToWindow(message) {
  window.postMessage(JSON.stringify({
    target: 'cliqz-offers-cc',
    origin: 'iframe',
    message
  }), '*');
}

export function messageHandler(message) {
  switch (message.action) {
    case 'pushData': {
      draw(message.data);
    }
      break;
    default: {
      // nothing to do
    }
  }
}


window.addEventListener('message', (ev) => {
  const data = JSON.parse(ev.data);
  if (data.target === 'cliqz-offers-cc' &&
     data.origin === 'window') {
    messageHandler(data.message);
  }
});

