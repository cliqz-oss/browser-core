/* global Components, console */
try {
  Components.utils.import("resource://gre/modules/Console.jsm");
} catch(e) {
  // Older version of Firefox
  Components.utils.import("resource://gre/modules/devtools/Console.jsm");
}
export default console;
