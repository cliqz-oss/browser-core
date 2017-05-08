// TODO: FF platform specific, move somewhere else and implement (probably mock) for other platforms
/* global AsyncShutdown */
Components.utils.import('resource://gre/modules/AsyncShutdown.jsm');

// FIXME: these two are blocking on browser uninstall & shutdown, promises are never resolved
// because (I think) the cliqz runloop is stopped
function addShutdownBlocker(condition) {
  AsyncShutdown.profileBeforeChange.addBlocker(
    'IncrementalStorage: flushing and closing before shutdown',
    condition,
  );
}

function removeShutdownBlocker(condition) {
  AsyncShutdown.profileBeforeChange.removeBlocker(condition);
}

export { addShutdownBlocker, removeShutdownBlocker };
