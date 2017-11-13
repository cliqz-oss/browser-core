/* globals Store */
import { Components } from './globals';
import config from '../core/config';

export function unload() {
  // unloading both protocols as we don't know which one was used by previous
  // extension
  try {
    Components.utils.unload('resource://cliqz/store.jsm');
  } catch (e) {
    // may blow if missing
  }
  try {
    Components.utils.unload('chrome://cliqz/content/store.jsm');
  } catch (e) {
    // may blow if missing
  }
}

// unloading in case previous version did not do that
unload();

Components.utils.import(`${config.baseURL}store.jsm`);

export default Store.state;

