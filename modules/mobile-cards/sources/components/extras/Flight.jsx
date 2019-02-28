import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { getMessage } from '../../../core/i18n';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import Link from '../Link';
import { agoDuration } from '../../helpers/logic';
import { elementSideMargins } from '../../styles/CardStyle';
import themeDetails from '../../themes';
// trigger with flug lh123

const colors = {
  black: 'rgb(0, 0, 0)',
  blackish: 'rgb(84, 84, 84)',
  green: 'rgb(71, 182, 37)',
  grey: 'rgb(51, 51, 51)',
  red: 'rgb(217, 85, 89)',
  lightGrey: 'rgb(166, 166, 166)'
};

const styles = theme => StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 5,
    ...elementSideMargins,
  },
  title: {
    color: themeDetails[theme].textColor,
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
    color: themeDetails[theme].textColor,
    fontSize: 20,
    fontWeight: '500',
  },
  routeRemaining: {
    backgroundColor: themeDetails[theme].flight.routeRemaining,
    height: 1
  },
  bannerText: {
    color: 'white',
    paddingTop: 5,
    paddingBottom: 5,
    ...elementSideMargins,
  },
  hotlineWrapper: {
    marginTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: themeDetails[theme].separatorColor,
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
    color: themeDetails[theme].textColor,
    fontSize: 10,
    marginRight: 5,
  },
  updated: {
    color: themeDetails[theme].flight.updated
  },
  cityAndDate: {
    color: themeDetails[theme].flight.cityAndDate
  },
  flightLabel: {
    color: themeDetails[theme].flight.label
  },
  flightInfo: {
    color: themeDetails[theme].flight.info,
    fontSize: 20
  }
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
      && this.arrival.actualTime === this.arrival.scheduledTime
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
    const theme = this.props.theme;
    return (
      <View
        accessible={false}
        accessibilityLabel="flight-title"
        style={styles(theme).container}
      >
        <Text style={styles(theme).title}>
          { this.props.data.flight_name }
        </Text>
      </View>
    );
  }

  displayUpdatedSince() {
    const theme = this.props.theme;
    if (this.cancelled) {
      return (
        <View
          accessible={false}
          accessibilityLabel="flight-updated"
          style={{ marginTop: 10, backgroundColor: this.statusColor }}
        >
          <Text style={styles(theme).bannerText}>{ getMessage('mobile_flight_no_updates') }</Text>
        </View>
      );
    }
    const updatedSince = this.props.data.last_updated_ago;
    if (!updatedSince) {
      return null;
    }
    return (
      <View
        accessible={false}
        accessibilityLabel="flight-updated"
        style={styles(theme).container}
      >
        <Text style={styles(theme).updated}>
          {`${getMessage('updated')} ${agoDuration(updatedSince)}`}
        </Text>
      </View>
    );
  }

  displayStatus() {
    const data = this.props.data;
    const theme = this.props.theme;
    const timeColor = themeDetails[theme].flight.statusTime;
    const status = (data.status || '').toUpperCase();
    const statusColor = this.statusColor;
    const scheduledDecoration = this.onSchedule ? 'none' : 'line-through';
    const actualDecoration = this.cancelled ? 'line-through' : 'none';
    return (
      <View style={styles(theme).statusContainer}>
        <View
          accessible={false}
          accessibilityLabel="flight-status"
          style={[styles(theme).status, { backgroundColor: statusColor }]}
        >
          <Text style={{ color: 'white', fontSize: 12 }}>
            { status }
          </Text>
        </View>
        <View
          accessible={false}
          accessibilityLabel="flight-actual-time-small"
          style={styles(theme).status}
        >
          <Text style={timeStyle(timeColor, scheduledDecoration).status}>
            {this.departure.scheduledTime}
            &#8594;
            {this.arrival.scheduledTime}
          </Text>
        </View>
        {
          !this.onSchedule
          && (
            <View
              accessible={false}
              accessibilityLabel="flight-estimated-time-small"
              style={styles(theme).status}
            >
              <Text style={timeStyle(statusColor, actualDecoration).status}>
                {this.departure.actualTime}
                &#8594;
                {this.arrival.actualTime}
              </Text>
            </View>
          )
        }
      </View>
    );
  }

  displayRoute() {
    const data = this.props.data;
    const theme = this.props.theme;
    const statusColor = this.statusColor;
    const progress = Number(data.plane_position);
    const remaining = 100 - progress;
    return (
      <View style={styles(theme).routeContainer}>
        <View
          accessible={false}
          accessibilityLabel="flight-depart-city"
          style={{ flex: 1 }}
        >
          <Text style={styles(theme).routeCity}>
            {this.departure.locationShortcut}
          </Text>
        </View>
        <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center' }}>
          {
            Boolean(progress)
            && <View style={{ backgroundColor: statusColor, height: 1, flex: progress }} />
          }
          <View
            accessible={false}
            accessibilityLabel="flight-plane-icon"
          >
            <NativeDrawable source={this.planeIcon} style={{ height: 20, width: 20 }} />
          </View>
          {
            Boolean(remaining)
            && <View style={[styles(theme).routeRemaining, { flex: remaining }]} />
          }
        </View>
        <View
          accessible={false}
          accessibilityLabel="flight-arrival-city"
          style={{ flex: 1 }}
        >
          <Text style={[styles(theme).routeCity, { textAlign: 'right' }]}>
            {this.arrival.locationShortcut}
          </Text>
        </View>
      </View>
    );
  }

  displayDetails(data) {
    const theme = this.props.theme;
    const timeColor = themeDetails[theme].flight.time;
    const onSchedule = data.scheduledTime === data.actualTime;
    const early = data.scheduledTime > data.actualTime;
    const scheduledDecoration = onSchedule ? 'none' : 'line-through';
    const actualColor = early ? colors.green : colors.red;
    const actualDecoration = this.cancelled ? 'line-through' : 'none';
    return (
      <View style={styles(theme).container}>
        <Text
          accessible={false}
          accessibilityLabel="flight-city-and-date"
          style={styles(theme).cityAndDate}
        >
          {`${data.locationName} ${data.scheduledDate}`}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View
            accessible={false}
            accessibilityLabel="flight-direction-time-label"
            style={{ flex: 5 }}
          >
            <Text style={styles(theme).flightLabel}>
              { getMessage(data.scheduledMessage) }
            </Text>
          </View>
          <View
            accessible={false}
            accessibilityLabel="flight-terminal-label"
            style={{ flex: 3 }}
          >
            <Text style={styles(theme).flightLabel}>Terminal</Text>
          </View>
          <View
            accessible={false}
            accessibilityLabel="flight-gate-label"
            style={{ flex: 2 }}
          >
            <Text style={styles(theme).flightLabel}>
              { getMessage('mobile_flight_gate') }
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 5, flexDirection: 'row' }}>
            <View
              accessible={false}
              accessibilityLabel="flight-scheduled-time-big"
            >
              <Text style={timeStyle(timeColor, scheduledDecoration).time}>
                { data.scheduledTime }
              </Text>
            </View>
            {
              onSchedule
              || (
                <View
                  accessible={false}
                  accessibilityLabel="flight-actual-time-big"
                >
                  <Text style={timeStyle(actualColor, actualDecoration).time}>
                    {data.actualTime}
                  </Text>
                </View>
              )
            }
          </View>
          <View
            accessible={false}
            accessibilityLabel="flight-terminal"
            style={{ flex: 3 }}
          >
            <Text style={styles(theme).flightInfo}>{ data.terminal }</Text>
          </View>
          <View
            accessible={false}
            accessibilityLabel="flight-gate"
            style={{ flex: 2 }}
          >
            <Text style={styles(theme).flightInfo}>{ data.gate }</Text>
          </View>
        </View>
      </View>
    );
  }

  displayHotline(flightName) {
    const theme = this.props.theme;
    if (!flightName.startsWith('Lufthansa')) {
      return null;
    }
    const callIcon = normalizeUrl('call-icon.svg');
    return (
      <Link
        action="callNumber"
        param="+496986799799"
      >
        <View style={styles(theme).hotlineWrapper}>
          <View style={styles(theme).hotlineView}>
            <NativeDrawable
              source={callIcon}
              color="black"
              style={styles(theme).callIcon}
            />
            <Text style={styles(theme).hotlineText}>
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
