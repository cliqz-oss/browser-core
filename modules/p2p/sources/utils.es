import CliqzUtils from 'core/utils';

function createHiddenWindow() {
    // We need to use this function, 'load' events do not seem to be firing for hidden window...
  function waitInitWindow(w) {
    return new Promise((resolve) => {
      const _ = () => {
        if (w.document.readyState === 'complete') {
          resolve(w);
        } else {
          CliqzUtils.setTimeout(_, 50);
        }
      };
      _();
    });
  }
  const w = Services.appShell.hiddenDOMWindow;
  // TODO: did not manage to do this with any window/document event, but maybe is possible
  return waitInitWindow(w)
    .then(() => {
      // A trick found in http://forums.mozillazine.org/viewtopic.php?f=19&t=256053,
      // haven't found a better way if we want to use hidden window
      const iframe = w.document.createElement('iframe');
      iframe.src = 'chrome://cliqz/content/p2p/content/hiddenWindow.html';
      w.document.documentElement.appendChild(iframe);
      return waitInitWindow(iframe.contentWindow); // TODO: this can be done with some event handler
    });
}

function destroyHiddenWindow(window) {
  const w = Services.appShell.hiddenDOMWindow;
  const iframes = w.document.getElementsByTagName('iframe');
  const n = iframes.length;
  for (let i = 0; i < n; i += 1) {
    if (iframes[i].contentWindow === window) {
      iframes[i].parentNode.removeChild(iframes[i]);
      break;
    }
  }
}

export { createHiddenWindow, destroyHiddenWindow };
