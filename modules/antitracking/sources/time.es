/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint prefer-template: 'off' */

import prefs from '../core/prefs';

// this is the sanitised timestamp retrieved from humanweb.
let hwTs = null;

/** Get datetime string of the current hour in the format YYYYMMDDHH
 */
export function getTime() {
  const date = new Date();
  const ts = hwTs;
  let _ts;
  let h = null;
  if (!ts) {
    let d = null;
    let m = null;
    let y = null;
    d = (date.getDate() < 10 ? '0' : '') + date.getDate();
    m = (date.getMonth() < 9 ? '0' : '') + parseInt((date.getMonth()) + 1, 10);
    h = (date.getUTCHours() < 10 ? '0' : '') + date.getUTCHours();
    y = date.getFullYear();
    _ts = y + '' + m + '' + d + '' + h;
  } else {
    h = (date.getUTCHours() < 10 ? '0' : '') + date.getUTCHours();
    _ts = ts + '' + h;
  }
  return _ts;
}

export function getConfigTs() {
  // lazy loading of pref
  if (hwTs === null) {
    hwTs = prefs.get('config_ts', null);
  }
  if (!hwTs) {
    hwTs = getTime().substring(0, 8);
  }
  return hwTs;
}

export function updateTimestamp(ts) {
  hwTs = ts;
}

export function newUTCDate() {
  const dayHour = getTime();
  return new Date(Date.UTC(
    dayHour.substring(0, 4),
    parseInt(dayHour.substring(4, 6), 10) - 1,
    dayHour.substring(6, 8),
    dayHour.substring(8, 10)
  ));
}

export function dateString(date) {
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString(); // getMonth() is zero-based
  const dd = date.getDate().toString();
  return yyyy + (mm[1] ? mm : `0${mm[0]}`) + (dd[1] ? dd : `0${dd[0]}`); // padding
}

export function hourString(date) {
  const hour = date.getUTCHours().toString();
  return dateString(date) + (hour[1] ? hour : `0${hour[0]}`);
}

export function getHourTimestamp() {
  return getTime().slice(0, 10);
}
