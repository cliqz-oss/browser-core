(function() {
  var overlay;
  var iframeUrl = chrome.runtime.getURL('modules/onboarding-overlay/index.html');
  var iframe = document.querySelector('[src="' + iframeUrl + '"]');

  window.addEventListener('message', function(message) {
    if (message.data.action === 'continue'){
      document.body.removeChild(overlay);
    }
  });

  if (iframe) {
    // if the onboarding overlay iframe is already here
    // we need to reload it in order to get access to the new extension
    // this can happen only if the extension was restarted during onboarding page
    // the restart can be caused by the "allow in private mode" option from Firefox

    overlay = iframe.parentNode;
    overlay.removeChild(iframe);
    overlay.appendChild(iframe);
    return;
  }

  overlay = document.createElement("div");
  overlay.style = "position: fixed;width: 100vw;height: 100vh;min-width:640px;min-height: 665px;top: 0;left: 0;background-color: rgba(0,0,0,0.5);z-index: 1000;cursor: pointer;";
  document.body.appendChild(overlay);

  iframe = document.createElement("iframe");
  iframe.setAttribute("src", iframeUrl);
  iframe.style = "border: 0; width: 640px; height: 665px;display: block;margin: 0;position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);"
  overlay.appendChild(iframe);
})()
