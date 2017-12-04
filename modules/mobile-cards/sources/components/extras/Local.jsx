import React from 'react';
import { StyleSheet, View, Text, TextInput } from 'react-native';

import i18n, { getMessage } from '../../../core/i18n';
import utils from '../../../core/utils';
import Title from '../partials/Title';
import Link from '../Link';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import { elementTopMargin, elementSideMargins } from '../../styles/CardStyle';


export default class extends React.Component {

  renderLocation(data) {
    const distance = Helpers.calculateDistance(data.lon, data.lat);
    const opening = Helpers.calculateOpeningStatus(data.opening_hours);
    const mapIcon = normalizeUrl('maps-logo.svg');
    const callIcon = normalizeUrl('call-icon.svg');
    return <View style={styles.container}>
      <View style={[styles.row, styles.centerCenter, styles.size3]}>
        <Link actionName='mobile-search:map' actionParams={[data.mu]} style={styles.size1}>
          <View style={[styles.column, styles.centerCenter]}>
            <NativeDrawable style={styles.map} source={mapIcon} />
            <Text style={{ color: '#00AEF0' }}>{distance}</Text>
          </View>
        </Link>
        <Text style={[styles.size2, { color: 'black' }]}>{data.address}</Text>
      </View>
      <View style={[styles.row, styles.centerCenter, styles.size3, styles.topMargin15]}>
          {
            opening && <View style={[styles.column, styles.centerCenter, styles.size1]}>
              <View style={[styles.column, styles.centerStart, styles.size1]}>
                <Text style={{ color: opening.color }}>{opening.stt_text}</Text>
                <Text style={{ color: 'black' }}>{opening.time_info_til}</Text>
                <Text style={{ color: 'black' }}>{opening.time_info_str}</Text>
              </View>
            </View>
          }
          {
            data.phonenumber &&
            <Link
              style={styles.size1}
              actionName='mobile-search:call'
              actionParams={[data.phonenumber]}
            >
              <View style={[styles.column, styles.centerCenter]}>
                <NativeDrawable style={styles.call} source={callIcon} />
                <Text style={{ color: 'black' }}>{getMessage('mobile_local_card_call')}</Text>
              </View>
            </Link>
          }
      </View>
    </View>
  }

  renderNoLocation(data) {
    const locationPin = normalizeUrl('location_pin.svg');

    return <Link
        style={styles.size1}
        actionName='mobile-search:share-location'
      >
      <View style={styles.button}>
        <NativeDrawable style={styles.pin} source={locationPin} />
        <Text style={styles.buttonText} >{getMessage('mobile_share_location')}</Text>
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
    ...elementTopMargin,
  },
  row: {
    flexDirection: 'row'
  },
  column: {
    flexDirection: 'column'
  },
  centerCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerStart: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  size3: {
    flex: 3
  },
  size2: {
    flex: 2
  },
  size1: {
    flex: 1
  },
  topMargin15: {
    marginTop: 15
  },
  map: {
    width: 50, // to be changed with proportional dimensions
    height: 50,
  },
  call: {
    width: 25, // to be changed with proportional dimensions
    height: 25,
  },
  button: {
    backgroundColor: '#00AEF0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    borderRadius: 4,
    ...elementSideMargins,
    ...elementTopMargin,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'normal',
    fontSize: 14,
    marginLeft: 5,
  },
  pin: {
    width: 16,
    height: 22,
    marginRight: 5,
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
