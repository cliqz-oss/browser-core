/* eslint-disable */
import prefs from '../../core/prefs';

function getHpnTimeStamp() {
  return prefs.get('config_ts', '19700101');
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


export {
  getHpnTimeStamp,
  getTopLevelCategory,
  joinKeyVal,
  splitKeyVal,
  generateItems,
};
