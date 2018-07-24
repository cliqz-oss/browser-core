import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { getMessage } from '../../../core/i18n';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import Link from '../Link';
import { agoDuration } from '../../helpers/logic';
import { elementSideMargins } from '../../styles/CardStyle';

// trigger with flug lh123

const colors = {
  black: 'rgb(0, 0, 0)',
  blackish: 'rgb(84, 84, 84)',
  green: 'rgb(71, 182, 37)',
  grey: 'rgb(51, 51, 51)',
  red: 'rgb(217, 85, 89)',
  lightGrey: 'rgb(166, 166, 166)'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 5,
    ...elementSideMargins,
  },
  title: {
    color: 'black',
    fontSize: 18,
    marginTop: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    ...elementSideMargins,
  },
  status: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingRight: 5,
    paddingLeft: 5,
    marginRight: 5,
    borderRadius: 2,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 10,
    ...elementSideMargins,
  },
  routeCity: {
    color: 'black',
    fontSize: 20,
    fontWeight: '500',
  },
  bannerText: {
    color: 'white',
    paddingTop: 5,
    paddingBottom: 5,
    ...elementSideMargins,
  },
  hotlineWrapper: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDECEC',
  },
  hotlineView: {
    paddingTop: 10,
    flexDirection: 'row',
    ...elementSideMargins,
  },
  callIcon: {
    height: 15,
    width: 15,
    marginRight: 5
  },
  hotlineText: {
    color: 'black',
    fontSize: 10,
    marginRight: 5,
  },
});

const timeStyle = (color, textDecorationLine) => StyleSheet.create({
  status: {
    color,
    textDecorationLine,
    fontSize: 10,
  },
  time: {
    color,
    textDecorationLine,
    fontSize: 20,
    marginRight: 5,
  },
});

export default class Flight extends React.Component {
  get onSchedule() {
    return (
      this.departure.actualTime === this.departure.scheduledTime
      &&
      this.arrival.actualTime === this.arrival.scheduledTime
    );
  }

  get cancelled() {
    return this.props.data.flight_status === 'cancelled';
  }

  get status() {
    return this.props.data.flight_status;
  }

  get statusColor() {
    return this.lateArrival || this.cancelled ? colors.red : colors.green;
  }

  get planeIcon() {
    let planeIcon = '';
    if (this.status === 'scheduled') {
      planeIcon = 'plane-green-outline.svg';
    } else if (this.status === 'arrived') {
      if (this.lateArrival) {
        planeIcon = 'plane-red-outline.svg';
      } else {
        planeIcon = 'plane-green-outline.svg';
      }
    } else if (this.lateArrival || this.cancelled) {
      planeIcon = 'plane-red.svg';
    } else {
      planeIcon = 'plane-green.svg';
    }
    return normalizeUrl(planeIcon);
  }

  get earlyDeparture() {
    return this.departure.actualTime < this.departure.scheduledTime;
  }

  get lateDeparture() {
    return this.departure.actualTime > this.departure.scheduledTime;
  }

  get earlyArrival() {
    return this.arrival.actualTime < this.arrival.scheduledTime;
  }

  get lateArrival() {
    return this.arrival.actualTime > this.arrival.scheduledTime;
  }

  get departure() {
    const depart = this.props.data.depart_arrive[0];
    return {
      locationName: depart.location_name,
      locationShortcut: depart.location_short_name,
      timeColor: depart.time_color,
      scheduledTime: depart.scheduled_time,
      scheduledDate: depart.scheduled_date,
      actualTime: depart.estimate_actual_time,
      terminal: depart.terminal,
      gate: depart.gate,
      scheduledMessage: 'mobile_flight_scheduled_departure',
    };
  }

  get arrival() {
    const arrival = this.props.data.depart_arrive[1];
    return {
      locationName: arrival.location_name,
      locationShortcut: arrival.location_short_name,
      actualLocation: arrival.actual_location_short_name || '',
      timeColor: arrival.time_color,
      scheduledTime: arrival.scheduled_time,
      scheduledDate: arrival.scheduled_date,
      actualTime: arrival.estimate_actual_time,
      terminal: arrival.terminal,
      gate: arrival.gate,
      scheduledMessage: 'mobile_flight_scheduled_landing',
    };
  }

  displayTitle() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          { this.props.data.flight_name }
        </Text>
      </View>
    );
  }

  displayUpdatedSince() {
    if (this.cancelled) {
      return (
        <View style={{ marginTop: 10, backgroundColor: this.statusColor }}>
          <Text style={styles.bannerText}>{ getMessage('mobile_flight_no_updates') }</Text>
        </View>
      );
    }
    const updatedSince = this.props.data.last_updated_ago;
    if (!updatedSince) {
      return null;
    }
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.lightGrey }}>
          { getMessage('updated') } { agoDuration(updatedSince)}
        </Text>
      </View>
    );
  }

  displayStatus() {
    const data = this.props.data;
    const status = (data.status || '').toUpperCase();
    const statusColor = this.statusColor;
    const scheduledDecoration = this.onSchedule ? 'none' : 'line-through';
    const actualDecoration = this.cancelled ? 'line-through' : 'none';
    return (
      <View style={styles.statusContainer}>
        <View style={[styles.status, { backgroundColor: statusColor }]}>
          <Text style={{ color: 'white', fontSize: 12 }}>
            { status }
          </Text>
        </View>
        <View style={styles.status}>
          <Text style={timeStyle(colors.grey, scheduledDecoration).status}>
            { this.departure.scheduledTime } &#8594; { this.arrival.scheduledTime }
          </Text>
        </View>
        {
          !this.onSchedule
          &&
          <View style={styles.status}>
            <Text style={timeStyle(statusColor, actualDecoration).status}>
              { this.departure.actualTime } &#8594; { this.arrival.actualTime }
            </Text>
          </View>
        }
      </View>
    );
  }

  displayRoute() {
    const data = this.props.data;
    const statusColor = this.statusColor;
    const progress = Number(data.plane_position);
    const remaining = 100 - progress;
    return (
      <View style={styles.routeContainer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.routeCity}>
            {this.departure.locationShortcut}
          </Text>
        </View>
        <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center' }}>
          {
            Boolean(progress)
            &&
            <View style={{ backgroundColor: statusColor, height: 1, flex: progress }} />
          }
          <NativeDrawable source={this.planeIcon} style={{ height: 20, width: 20 }} />
          {
            Boolean(remaining)
            &&
            <View style={{ backgroundColor: colors.blackish, height: 1, flex: remaining }} />
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.routeCity, { textAlign: 'right' }]}>
            {this.arrival.locationShortcut}
          </Text>
        </View>
      </View>
    );
  }

  displayDetails(data) {
    const onSchedule = data.scheduledTime === data.actualTime;
    const early = data.scheduledTime > data.actualTime;
    const scheduledDecoration = onSchedule ? 'none' : 'line-through';
    const actualColor = early ? colors.green : colors.red;
    const actualDecoration = this.cancelled ? 'line-through' : 'none';
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.blackish }}>{ data.locationName } { data.scheduledDate }</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 5 }}>
            <Text style={{ color: colors.lightGrey }}>
              { getMessage(data.scheduledMessage) }
            </Text>
          </View>
          <View style={{ flex: 3 }}>
            <Text style={{ color: colors.lightGrey }}>Terminal</Text>
          </View>
          <View style={{ flex: 2 }}>
            <Text style={{ color: colors.lightGrey }}>
              { getMessage('mobile_flight_gate') }
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 5, flexDirection: 'row' }}>
            <Text style={timeStyle(colors.black, scheduledDecoration).time}>
              { data.scheduledTime }
            </Text>
            {
              onSchedule
              ||
              <Text style={timeStyle(actualColor, actualDecoration).time}>{ data.actualTime }</Text>
            }
          </View>
          <View style={{ flex: 3 }}>
            <Text style={{ color: colors.blackish, fontSize: 20 }}>{ data.terminal }</Text>
          </View>
          <View style={{ flex: 2 }}>
            <Text style={{ color: colors.blackish, fontSize: 20 }}>{ data.gate }</Text>
          </View>
        </View>
      </View>
    );
  }

  displayHotline(flightName) {
    if (!flightName.startsWith('Lufthansa')) {
      return null;
    }
    const callIcon = normalizeUrl('call-icon.svg');
    return (
      <Link
        action="callNumber"
        param="+496986799799"
      >
        <View style={styles.hotlineWrapper}>
          <View style={styles.hotlineView}>
            <NativeDrawable
              source={callIcon}
              color="black"
              style={styles.callIcon}
            />
            <Text style={styles.hotlineText}>
              { getMessage('mobile_flight_hotline', '+49 69 86 799 799') }
            </Text>
          </View>
        </View>
      </Link>
    );
  }

  render() {
    const data = this.props.data;
    if (!data.depart_arrive || data.depart_arrive.length !== 2) {
      return null;
    }
    return (
      <View>
        { this.displayTitle() }
        { this.displayStatus() }
        { this.displayUpdatedSince() }
        { this.displayRoute() }
        { this.displayDetails(this.departure) }
        { this.displayDetails(this.arrival) }
        { this.displayHotline(data.flight_name) }
      </View>
    );
  }
}
