/**
* @namespace ui.views
* @class LocalDataSc
*/
export default class {
  /**
  * @method enhanceResults
  * @param data
  */
  enhanceResults(data) {

    function parseTime(timeStr) {  // e.g. timeStr: 10.30
      var time = timeStr.split(".");
      return {
        hours: parseInt(time[0]) || 0,
        minutes: parseInt(time[1]) || 0
      };
    }

    function twoDigit(num) {
      return [
        num < 10 ? "0" : "",
        num
      ].join("");
    }

    var isBigSnippet = Boolean(data.extra.phonenumber || data.extra.address || data.extra.opening_hours || data.extra.no_location),
        rating_img = null,
        t = new Date(),
        current_t = [
          twoDigit(t.getHours()),
          twoDigit(t.getMinutes())
        ].join("."),
        open_stt, timeInfos = [],
        openingColors =  {
          open: "#74d463",
          closed: "#E92207",
          open_soon: "#FFC802",
          close_soon: "#FFC802"
        };

    data.extra.phone_address = data.extra.phonenumber || data.extra.address;

    if (data.extra.opening_hours && data.extra.opening_hours.length > 0) {

      data.extra.opening_hours.forEach(function (el) {
        if (!el.open || !el.close) { return; }
        timeInfos.push(el.open.time + " - " + el.close.time);
        if(open_stt && open_stt !== "closed") { return; }

        var openTime  = parseTime(el.open.time),
        closeTime = parseTime(el.close.time),
        closesNextDay = el.close.day !== el.open.day,
        /** Difference in minutes from opening/closing times to current time **/
        minutesFrom;
        if (el.open.timestamp && el.close.timestamp) {
          minutesFrom = {
            opening: ((t.getTime()/1000) - el.open.timestamp)/60,
            /* If it closes the next day, we need to subtract 24 hours from the hour difference */
            closing: ((t.getTime()/1000) - el.close.timestamp)/60,
          };
        }
        else {
          minutesFrom = {
            opening: 60 * (t.getHours() - openTime.hours) + (t.getMinutes() - openTime.minutes),
            /* If it closes the next day, we need to subtract 24 hours from the hour difference */
            closing: 60 * (t.getHours() - closeTime.hours - ( closesNextDay ? 24 : 0) ) + (t.getMinutes() - closeTime.minutes)
          };
        }

        if (minutesFrom.opening > 0 && minutesFrom.closing < 0) {
          open_stt = "open";
          if (minutesFrom.closing > -60){
            open_stt =  "close_soon";
          }
        } else {
          open_stt = "closed";
          if (minutesFrom.opening > -60 && minutesFrom.opening < 0) {
            open_stt = "open_soon";
          }
        }
      });


      data.extra.opening_status = {
        color: openingColors[open_stt],
        stt_text: CliqzUtils.getLocalizedString(open_stt),
        time_info_til: CliqzUtils.getLocalizedString("open_hour"),
        time_info_str: timeInfos.join(", ")
      };
    }

    if (!data.extra.rating) { data.extra.rating = 0; }

    rating_img = "https://cdn.cliqz.com/extension/EZ/richresult/stars" + Math.max(0, Math.min(Math.round(data.extra.rating), 5)) + ".svg";

    if (!isBigSnippet) {
      data.extra.rich_data = {
        image: data.extra.image,
        url_ratingimg: rating_img,
        name: data.extra.t,
        des: data.extra.desc
      }
    } else {
      data.extra.url_ratingimg = rating_img;
    }


    data.extra.big_rs_size = isBigSnippet;
  }
};
