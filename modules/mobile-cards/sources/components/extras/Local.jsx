/* eslint-disable camelcase */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getMessage } from '../../../core/i18n';
import prefs from '../../../core/prefs';
import PermissionManager from '../../../platform/permission-manager';
import Link from '../Link';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import { elementTopMargin, elementSideMargins } from '../../styles/CardStyle';
import { withCliqz } from '../../cliqz';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create({
  container: {
    ...elementTopMargin,
    ...elementSideMargins,
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
  },
  location: {
    color: themeDetails[theme].textColor
  },
  distance: {
    color: themeDetails[theme].local.distanceTxtColor
  }
});

const Helpers = {
  parseTime(timeStr) { // e.g. timeStr: 10.30
    const time = timeStr.split('.');
    return {
      hours: parseInt(time[0], 10) || 0,
      minutes: parseInt(time[1], 10) || 0
    };
  },

  calculateOpeningStatus(opening_hours) {
    if (opening_hours) {
      const timeInfos = [];
      let open_stt;
      const openingColors = {
        open: '#00AEF0',
        closed: '#E64C66',
        open_soon: '#E64C66',
        close_soon: '#45C2CC'
      };
      const t = new Date();
      opening_hours.forEach((el) => {
        if (!el.open || !el.close) { return; }
        timeInfos.push(`${el.open.time} - ${el.close.time}`);
        if (open_stt && open_stt !== 'closed') { return; }


        const openTime = Helpers.parseTime(el.open.time);
        const closeTime = Helpers.parseTime(el.close.time);
        const closesNextDay = el.close.day !== el.open.day;
        /* Difference in minutes from opening/closing times to current time */
        const minutesFrom = {
          opening: (60 * (t.getHours() - openTime.hours)) + (t.getMinutes() - openTime.minutes),
          /* If it closes the next day, we need to subtract 24 hours from the hour difference */
          closing: (60 * (t.getHours() - closeTime.hours - (closesNextDay ? 24 : 0)))
            + (t.getMinutes() - closeTime.minutes)
        };

        if (minutesFrom.opening > 0 && minutesFrom.closing < 0) {
          open_stt = 'open';
          if (minutesFrom.closing > -60) {
            open_stt = 'close_soon';
          }
        } else {
          open_stt = 'closed';
          if (minutesFrom.opening > -60 && minutesFrom.opening < 0) {
            open_stt = 'open_soon';
          }
        }
      });

      return {
        color: openingColors[open_stt],
        stt_text: open_stt && getMessage(open_stt),
        time_info_til: getMessage('open_hour'),
        time_info_str: timeInfos.join(', ')
      };
    }
    return null;
  },

  calculateDistance() {
    return null;
  },
};

class Local extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: this.props.data,
    };
  }

  async getLocationData() {
    const type = PermissionManager.PERMISSIONS.ACCESS_FINE_LOCATION;
    const granted = PermissionManager.RESULTS.GRANTED;

    const isLocationAccessGranted = (
      await PermissionManager.check(type) === granted
      || await PermissionManager.request(type) === granted
    );
    if (!isLocationAccessGranted) {
      return;
    }
    prefs.set('share_location', 'yes');

    const { geolocation, search } = this.props.cliqz;
    await geolocation.updateGeoLocation();
    // TODO: getSnippet action should receive location and get rid of utils.USER_LAT/USER_LNG
    const snippet = await search.getSnippet(this.props.result.text, this.props.result);
    if (snippet.extra) {
      this.setState({ data: snippet.extra });
    }
  }

  renderLocation(data) {
    const theme = this.props.theme;
    const distance = Helpers.calculateDistance(data.lon, data.lat, data.distance);
    const opening = Helpers.calculateOpeningStatus(data.opening_hours) || {};
    const mapIcon = normalizeUrl('maps-logo.svg');
    const callIcon = normalizeUrl('call-icon.svg');
    return (
      <View style={styles(theme).container}>
        <View style={[styles(theme).row, styles(theme).centerCenter, styles(theme).size3]}>
          <Link action="openMap" param={data.mu} style={styles(theme).size1}>
            <View style={[styles(theme).column, styles(theme).centerCenter]}>
              <NativeDrawable style={styles(theme).map} source={mapIcon} />
              <Text style={styles(theme).distance}>{distance}</Text>
            </View>
          </Link>
          <Text style={[styles(theme).size2, styles(theme).location]}>{data.address}</Text>
        </View>
        <View
          style={[
            styles(theme).row,
            styles(theme).centerCenter,
            styles(theme).size3,
            styles(theme).topMargin15
          ]}
        >
          {
            opening.stt_text
            && (
              <View style={[styles(theme).column, styles(theme).centerCenter, styles(theme).size1]}>
                <View
                  style={[styles(theme).column, styles(theme).centerStart, styles(theme).size1]}
                >
                  <Text style={{ color: opening.color }}>{opening.stt_text}</Text>
                  <Text style={styles(theme).location}>{opening.time_info_til}</Text>
                  <Text style={styles(theme).location}>{opening.time_info_str}</Text>
                </View>
              </View>
            )
          }
          {
            data.phonenumber
            && (
              <Link
                action="callNumber"
                param={data.phonenumber}
                style={styles(theme).size1}
              >
                <View style={[styles(theme).column, styles(theme).centerCenter]}>
                  <NativeDrawable style={styles(theme).call} source={callIcon} />
                  <Text style={styles(theme).location}>{getMessage('mobile_local_card_call')}</Text>
                </View>
              </Link>
            )
          }
        </View>
      </View>
    );
  }

  renderNoLocation() {
    const locationPin = normalizeUrl('location_pin.svg');
    const theme = this.props.theme;

    return (
      <Link
        style={styles(theme).size1}
        onPress={() => this.getLocationData()}
      >
        <View style={styles(theme).button}>
          <NativeDrawable style={styles(theme).pin} source={locationPin} />
          <Text style={styles(theme).buttonText}>{getMessage('mobile_share_location')}</Text>
        </View>
      </Link>
    );
  }

  render() {
    const data = this.state.data;
    if (data.no_location) {
      return this.renderNoLocation(data);
    }
    if (data.address) {
      return this.renderLocation(data);
    }
    return null;
  }
}

export default withCliqz(Local);
