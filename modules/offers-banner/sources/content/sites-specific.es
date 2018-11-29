function _setMargins(window, node, value) {
  const doc = typeof node === 'string'
    ? window.document.getElementById(node)
    : window.document.documentElement;
  if (!doc) { return; }
  doc.style.setProperty('margin', value, 'important');
}

export function beforeIframeShown(window) {
  _setMargins(window, null, '115px 0');
  const url = window.document.location.hostname;
  if (url.includes('google')) {
    _setMargins(window, 'viewport', '115px 0');
    _setMargins(window, 'searchform', '115px 0');
  }
}

export function afterIframeRemoved(window) {
  _setMargins(window, null, '0 0');
  const url = window.document.location.hostname;
  if (url.includes('google')) {
    _setMargins(window, 'viewport', '0 0');
    _setMargins(window, 'searchform', '0 0');
  }
}
