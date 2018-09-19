import URLBar from './urlbar';
import Dropdown from './dropdown';
import { baseURL } from '../../core/config';

class BrowserDropdown extends Dropdown {
  _resolveURL(url) {
    return `${baseURL}${url.replace(/^\/modules\//, '')}`;
  }
}

const dropdown = new BrowserDropdown();
const urlbar = new URLBar(dropdown);

export default {
  ...dropdown.getAPI(),
  ...urlbar.getAPI(),

  destroy: () => {
    dropdown.destroy();
    urlbar.destroy();
  }
};
