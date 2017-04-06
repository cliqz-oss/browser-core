import CliqzUtils from 'core/utils';

export default class {
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

    var isBigSnippet = Boolean(data.phonenumber || data.address || data.opening_hours || data.no_location),
        rating_img = null,
        t = new Date(),
        current_t = [
          twoDigit(t.getHours()),
          twoDigit(t.getMinutes())
        ].join("."),
        open_stt, timeInfos = [],
        openingColors =  {
          open: "#45C2CC",
          closed: "#E64C66",
          open_soon: "#E64C66",
          close_soon: "#45C2CC"
        };

    data.phone_address = data.phonenumber || data.address;

    if (data.opening_hours) {

      data.opening_hours.forEach(function (el) {
        if (!el.open || !el.close) { return; }
        timeInfos.push(el.open.time + " - " + el.close.time);
        if(open_stt && open_stt !== "closed") { return; }


        var openTime  = parseTime(el.open.time),
        closeTime = parseTime(el.close.time),
        closesNextDay = el.close.day !== el.open.day,
        /** Difference in minutes from opening/closing times to current time **/
        minutesFrom = {
          opening:  60 * (t.getHours() - openTime.hours) + (t.getMinutes() - openTime.minutes),
          /* If it closes the next day, we need to subtract 24 hours from the hour difference */
          closing: 60 * (t.getHours() - closeTime.hours - ( closesNextDay ? 24 : 0) ) + (t.getMinutes() - closeTime.minutes)
        };

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


      data.opening_status = {
        color: openingColors[open_stt],
        stt_text: open_stt && CliqzUtils.getLocalizedString(open_stt),
        time_info_til: CliqzUtils.getLocalizedString("open_hour"),
        time_info_str: timeInfos.join(", ")
      };
    }

    if (!data.rating) { data.rating = 0; }

    rating_img = "https://cdn.cliqz.com/extension/EZ/richresult/stars" + Math.max(0, Math.min(Math.round(data.rating), 5)) + ".svg";

    if (!isBigSnippet) {
      data.extra = {
        rich_data: {
          image: data.image,
          url_ratingimg: rating_img,
          name: data.t,
          des: data.desc
        }
      }
    } else {
      data.url_ratingimg = rating_img;
    }


    data.big_rs_size = isBigSnippet;

    const distance = CliqzUtils.distance(data.lon, data.lat) * 1000;
    if (distance > -1) {
      data.distance = distance;
    }

    data.deepLinks = ((data.deepResults || []).find(res => res.type === 'buttons') || {}).links
    return data;
  }
};
