/* eslint-disable */

/**
 * Get timestamp required by HPN
 * @return {String} date in string
 */
function getHpnTimeStamp() {
  // TODO: this is the copy function from `modules/offers-v2/signals_handler`
  // Since the method is not public for external modules, at the moment, we just copy the implementation
  // Be aware that there might be problem with HPN
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function getTopLevelCategory(category) {
  const pos = category.indexOf('.');
  if (pos !== -1) {
    return category.substring(0, pos);
  }
  return category;
}

function joinKeyVal(key, val) {
  return `${key}|${val}`;
}

function splitKeyVal(str) {
  return str.split('|');
}

/**
 * generator for a list
 * @param {List} list
 */
function* generateItems(list) {
  for (var i = 0; i < list.length; i++) { yield list[i]; }
}

function now() {
  return new Date();
}

export {
  getHpnTimeStamp,
  getTopLevelCategory,
  joinKeyVal,
  splitKeyVal,
  generateItems,
  now
};
