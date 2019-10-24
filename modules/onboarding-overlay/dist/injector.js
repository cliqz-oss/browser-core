var overlay = document.createElement("div");
overlay.style = "position: absolute;width: 100vw;height: 100vh;min-width:640px;min-height: 665px;top: 0;left: 0;background-color: rgba(0,0,0,0.5);z-index: 1000;cursor: pointer;";
document.body.appendChild(overlay);

var optionsPage = document.createElement("iframe");
optionsPage.setAttribute("src", chrome.runtime.getURL('modules/onboarding-overlay/index.html'));
optionsPage.style = "border: 0; width: 640px; height: 665px;display: block;margin: 0;position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);"
overlay.appendChild(optionsPage);

optionsPage.addEventListener('load', function() {
  optionsPage.contentWindow.addEventListener('message', function(message) {
    if (message.data.action === 'continue'){
      document.body.removeChild(overlay);
    }
  });
}, true);
