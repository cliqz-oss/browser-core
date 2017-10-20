import React from 'react';
import { StyleSheet, View, Text, TextInput } from 'react-native';

import i18n, { getMessage } from '../../modules/core/i18n';
import utils from '../../modules/core/utils';
import Title from '../partials/Title';
import Link from '../Link';
import NativeDrawable from '../custom/NativeDrawable';


export default class extends React.Component {

  renderLocation(data) {
    const distance = Helpers.calculateDistance(data.lon, data.lat);
    const opening = Helpers.calculateOpeningStatus(data.opening_hours);
    return <View style={styles.container}>
      <View style={styles.table}>
        <Link actionName='mobile-search:map' actionParams={[data.mu]}>
          <View>
            <NativeDrawable style={styles.map} src='ic_ez_maps_logo' />
            <Text style={styles.body}>{distance}</Text>
          </View>
        </Link>
        <Text style={styles.body}>{data.address}</Text>
      </View>
      <View style={styles.table}>
          { 
            opening && <View style={styles.container}>
              <Text style={styles.body}>{opening.stt_text}</Text>
              <Text style={styles.body}>{opening.time_info_til}</Text>
              <Text style={styles.body}>{opening.time_info_str}</Text>
            </View>
          }
          {
            data.phonenumber &&
            <Link
              style={styles.container}
              actionName='mobile-search:call'
              actionParams={[data.phonenumber]}
            >
              <View>
                <NativeDrawable style={styles.call} src='ic_ez_call_icon' />
                <Text style={styles.body}>{getMessage('mobile_local_card_call')}</Text>
              </View>
            </Link>
          }
      </View>
    </View>
  }

  renderNoLocation(data) {
    return <Link
        style={styles.container}
        actionName='mobile-search:share-location'
      >
      <View style={styles.button}>
        <NativeDrawable style={styles.pin} src='ic_ez_location_pin' />
        <Text>{getMessage('mobile_share_location')}</Text>
      </View>
    </Link>;
  }

  render() {
    const data = this.props.data;
    if (data.no_location) {
      return this.renderNoLocation(data);
    } else if (data.address) {
      return this.renderLocation(data);
    }
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  table: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  body: {
    color: 'black',
    flex: 1,
  },
  map: {
    width: 50, // to be changed with proportional dimensions
    height: 50,
  },
  call: {
    width: 25, // to be changed with proportional dimensions
    height: 25,
  },
  address: {
    flex: 3,
  },
  button: {
    backgroundColor: '#00AEF0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  pin: {
    width: 15,
    height: 15,
  }
});


const Helpers = {
  parseTime(timeStr) {  // e.g. timeStr: 10.30
    var time = timeStr.split(".");
    return {
      hours: parseInt(time[0]) || 0,
      minutes: parseInt(time[1]) || 0
    };
  },

  calculateOpeningStatus(opening_hours) {
    if (opening_hours) {
      let timeInfos = [];
      let open_stt;
      const openingColors =  {
        open: "#00AEF0",
        closed: "#E64C66",
        open_soon: "#E64C66",
        close_soon: "#45C2CC"
      };
      const t = new Date();
      opening_hours.forEach(el => {
        if (!el.open || !el.close) { return; }
        timeInfos.push(el.open.time + " - " + el.close.time);
        if(open_stt && open_stt !== "closed") { return; }


        const openTime  = Helpers.parseTime(el.open.time),
        closeTime = Helpers.parseTime(el.close.time),
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

      return {
        color: openingColors[open_stt],
        stt_text: open_stt && getMessage(open_stt),
        time_info_til: getMessage("open_hour"),
        time_info_str: timeInfos.join(", ")
      };
    }
    return null;
  },

  calculateDistance(lon, lat) {
    const meters = utils.distance(lon, lat) * 1000;
    if (meters > -1) {
      let distance;
      let unit;
      if (meters < 1000) {
        distance = meters.toFixed(0);
        unit = 'm';
      } else {
        distance = (meters / 1000).toFixed(1);
        unit = 'km';
      }
      return `${distance.toLocaleString(i18n.currLocale)} ${unit}`;
    }
    return null;
  },
}