import utils from "core/utils";
import CliqzAntiPhishing from "anti-phishing/anti-phishing";

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    this.window.gBrowser.addProgressListener(CliqzAntiPhishing.listener);
  }

  unload() {
    this.window.gBrowser.removeProgressListener(CliqzAntiPhishing.listener);
  }

  status() {
    if (utils.getPref('cliqz-anti-phishing', false)) {
      return {
        visible: true,
        active: utils.getPref('cliqz-anti-phishing-enabled', false)
      }
    }
  }
}
