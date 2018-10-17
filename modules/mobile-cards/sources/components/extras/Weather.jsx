import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { getCardWidth, elementTopMargin } from '../../styles/CardStyle';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import MoreOn from '../partials/MoreOn';

const styles = StyleSheet.create({
  containerToday: {
    flex: 1,
    justifyContent: 'space-around',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tableDays: {
    flex: 1,
    justifyContent: 'space-around',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});


const stylesToday = (cardWidth = 0) => StyleSheet.create({
  dayText: {
    color: '#474747',
    fontSize: 17,
    fontWeight: '200',
    paddingBottom: 4,
  },
  temperatureText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 17,
  },
  maxMinText: {
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '200',
  },
  container: {
    flex: 1,
    justifyContent: 'space-around',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayWrapper: {
    marginTop: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: cardWidth / 2,
    height: cardWidth / 2,
  },
  dayIcon: {
    height: cardWidth / 2.5,
    width: cardWidth / 2.5,
  }
});

const stylesDay = (cardWidth = 0) => StyleSheet.create({
  temperatureText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 15,
  },
  dayText: {
    color: '#474747',
    fontSize: 15,
    fontWeight: '200',
    paddingBottom: 4,
  },
  maxMinText: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '200',
  },
  container: {
    flex: 1,
    justifyContent: 'space-around',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayWrapper: {
    marginTop: 30,
    justifyContent: 'center',
    alignItems: 'center',
    width: cardWidth / 2.5,
    height: cardWidth / 2.5,
  },
  dayIcon: {
    height: cardWidth / 4,
    width: cardWidth / 4,
  }
});

export default class Weather extends React.Component {
  displayDay(day, style) {
    const imageName = normalizeUrl(day.icon);
    return (
      <View
        accessible={false}
        accessibilityLabel={'weather-item'}
        key={day.weekday}
        style={style.dayWrapper}
      >
        <View
          accessible={false}
          accessibilityLabel={'weather-day'}
        >
          <Text style={style.dayText}>{day.weekday}</Text>
        </View>
        <View
          accessible={false}
          accessibilityLabel={'weather-temp'}
        >
          <Text style={style.temperatureText}>
            <Text style={style.maxMinText}>max.</Text> {day.max}{' '}
            <Text style={style.maxMinText}>/ min.</Text> {day.min}
          </Text>
        </View>
        <View
          accessible={false}
          accessibilityLabel={'weather-icon'}
          style={style.dayIcon}
        >
          <NativeDrawable source={imageName} style={style.dayIcon} />
        </View>
      </View>
    );
  }

  render() {
    const data = this.props.data;
    const today = {
      max: data.todayMax,
      min: data.todayMin,
      weekday: data.todayWeekday,
      icon: data.todayIcon,
    };
    const cardWidth = getCardWidth();
    const todayStyle = stylesToday(cardWidth);
    const dayStyle = stylesDay(cardWidth);

    return (
      <View>
        <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', ...elementTopMargin }}>
          <View style={styles.containerToday}>
            { this.displayDay(today, todayStyle) }
          </View>
          <View style={styles.tableDays}>
            { data.forecast.map(day => this.displayDay(day, dayStyle)) }
          </View>
        </View>
        <MoreOn
          provider="weatherunderground.com"
          url="http://www.weatherunderground.com"
        />
      </View>
    );
  }
}
