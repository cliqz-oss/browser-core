
window.addEventListener("message", function(ev){
  var data = JSON.parse(ev.data);
  if(data.target == 'cliqz-offers' &&
     data.origin == 'window'){
    messageHandler(data.message);
  }
});

// iframe to browser window
export function sendMessageToWindow(message){
  window.postMessage(JSON.stringify({
    target: 'cliqz-offers',
    origin: 'iframe',
    message: message
  }), '*');
}

// browser window to iframe
export function messageHandler(message){
  switch(message.action) {
    case 'render_template': {
      draw(message.data);
      break;
    }
  }
}
