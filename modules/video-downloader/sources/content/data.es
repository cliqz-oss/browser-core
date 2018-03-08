window.addEventListener('message', function(ev) {
  var data = JSON.parse(ev.data);
  if(data.target == 'cliqz-video-downloader' &&
     data.origin == 'window'){
    messageHandler(data.message)
  }
});

export function sendMessageToWindow(message){
  window.postMessage(JSON.stringify({
    target: 'cliqz-video-downloader',
    origin: 'iframe',
    message: message
  }), '*');
}

export function messageHandler(message){
  switch(message.action) {
    case 'pushData': {
      draw(message.data);
    }
  }
}
