var overlay = document.createElement("div");
overlay.style = "position: fixed;width: 100%;height: 100%;top: 0;left: 0;right: 0;bottom: 0;background-color: rgba(0,0,0,0.5);z-index: 1000;cursor: pointer;";
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
