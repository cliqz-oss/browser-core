/* global App, config */

const appName = 'cliqz';
const CLIQZ = {};
window.CLIQZ = CLIQZ;

const manifest = chrome.runtime.getManifest();
const port = browser.runtime.connectNative(appName);

const onConfig = (configMessage) => {
  if (configMessage.action === 'startApp') {
    // Merge provided config with defaults to App creation, then start.
    const { debug } = configMessage;
    const settings = configMessage.config.settings;
    const prefs = configMessage.config.prefs;
    CLIQZ.app = new App({
      debug,
      version: manifest.version,
      config: {
        ...config,
        settings: {
          ...config.settings,
          ...settings,
        },
        default_prefs: {
          ...config.default_prefs,
          ...prefs,
        }
      }
    });
    CLIQZ.app.start();

    // Setup listener for actions sent from the App
    port.onMessage.removeListener(onConfig);
    port.onMessage.addListener((message) => {
      const { id, module, action, args } = message;
      CLIQZ.app.modules[module].action(action, ...args).then((result) => {
        port.postMessage({
          id,
          result,
        });
      }, (error) => {
        port.postMessage({
          id,
          error,
        });
      });
    });
    CLIQZ.app.ready().then(() => {
      browser.runtime.sendNativeMessage(appName, 'ready');
    });
  }
};
// listen for a config message from the App
port.onMessage.addListener(onConfig);
