import ABTests from '../core/ab-tests';
import { isMobile } from '../core/platform';

/**
* @namespace theme
*/
export default class Win {
  /**
  * @class Theme
  * @constructor
  */

  constructor(settings) {
    this.window = settings.window;
  }

  /**
  * @method init
  */
  init() {
    // Do not wait for AB to load
    if (!isMobile) {
      ABTests.check();
    }
  }

  unload() {

  }
}
