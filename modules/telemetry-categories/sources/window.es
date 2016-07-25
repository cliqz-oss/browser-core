import background from 'telemetry-categories/background';

/**
* @class Window
* @namespace telemetry-categories
*/
export default class {
  constructor() {

  }
  /**
  * @method init
  */
  init() {
    background.start();
  }

  unload() {

  }
}
