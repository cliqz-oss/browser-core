function resize(iframe, obj) {
    iframe.style.width = obj.width + "px";
    iframe.style.height = obj.height + "px";
  }

  var all = document.getElementsByClassName('control-center');

  Array.prototype.forEach.call(all, function(node, idx) {
    try {
        node.contentWindow.chrome.i18n = chrome.i18n;
    } catch (e) {
        // i18n is missing in iframe on chromium, on firefox this code throws but i18n object is
        // there already
    }
    node.contentWindow.addEventListener("message", function (ev) {
    var data = JSON.parse(ev.data);
    if(data.target == 'cliqz-control-center' &&
       data.origin == 'iframe'){
      if (data.message.action === "resize") {
        resize(node, data.message.data);
      }
      if (data.message.action === "getEmptyFrameAndData") {
        node.contentWindow.postMessage(JSON.stringify({
          target: "cliqz-control-center",
          origin: "window",
          message: {
            action: "pushData",
            data: DATA[idx]
          },
        }), "*");
      }
    }
  });
  });