/* globals ExtensionAPI */
import Dropdown from './dropdownapi';

let dropdown = null;

global.omnibox2 = class extends ExtensionAPI {
  getAPI(context) {
    if (!dropdown) {
      dropdown = new Dropdown(context.extension);
      context.extension.callOnClose(dropdown);
    }
    return {
      omnibox2: dropdown.getAPI(context),
    };
  }
};
