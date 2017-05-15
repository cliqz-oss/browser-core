import utils from '../core/utils';

// this is the sanitised timestamp retrieved from humanweb.
let hwTs = utils.getPref('config_ts', null);

export function updateTimestamp(ts) {
  hwTs = ts;
}

/** Get datetime string of the current hour in the format YYYYMMDDHH
 */
export function getTime() {
  const date = new Date();
  var ts = hwTs;
  var _ts;
  if(!ts) {
    var d = null;
    var m = null;
    var y = null;
    var h = null;
    var hr = null;
    var _ts = null;
    d = (date.getDate()  < 10 ? "0" : "" ) + date.getDate();
    m = (date.getMonth() < 9 ? "0" : "" ) + parseInt((date.getMonth()) + 1);
    h = (date.getUTCHours() < 10 ? "0" : "" ) + date.getUTCHours();
    y = date.getFullYear();
    _ts = y + "" + m + "" + d + "" + h;
  } else {
    h = (date.getUTCHours() < 10 ? "0" : "" ) + date.getUTCHours();
    _ts = ts + "" + h;
  }
  return _ts;
};

export function newUTCDate() {
  var dayHour = getTime();
  return new Date(Date.UTC(dayHour.substring(0, 4),
                           parseInt(dayHour.substring(4, 6)) - 1,
                           dayHour.substring(6, 8),
                           dayHour.substring(8, 10)));
};

export function hourString(date) {
  var hour = date.getUTCHours().toString();
  return dateString(date) + (hour[1]?hour:'0'+hour[0]);
};

export function dateString(date) {
  var yyyy = date.getFullYear().toString();
  var mm = (date.getMonth()+1).toString(); // getMonth() is zero-based
  var dd  = date.getDate().toString();
  return yyyy + (mm[1]?mm:"0"+mm[0]) + (dd[1]?dd:"0"+dd[0]); // padding
};

export function getHourTimestamp() {
  return getTime().slice(0, 10);
}
