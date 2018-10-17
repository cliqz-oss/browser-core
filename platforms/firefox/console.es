/* global Components */
import Components from './globals-components';
import window from './globals-window';

if (typeof Components !== 'undefined' && (window === undefined || !window.console)) {
  try {
    Components.utils.import('resource://gre/modules/Console.jsm');
  } catch (e) {
    // Older version of Firefox
    Components.utils.import('resource://gre/modules/devtools/Console.jsm');
  }
}

export default (window ? window.console : console);
