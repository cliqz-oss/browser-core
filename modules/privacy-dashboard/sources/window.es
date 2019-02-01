/**
* @namespace privacy-dashboard
* @class Window
*/
export default class Win {
  /**
  * @method init
  */
  init() {}

  unload() {}

  status() {
    return {
      visible: true,
      url: chrome.runtime.getURL('modules/privacy-dashboard/index.html')
    };
  }
}
