import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { getCardWidth, elementTopMargin } from '../../styles/CardStyle';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import MoreOn from '../partials/MoreOn';

export default class Weather extends React.Component {

  displayToday(day) {
    const cardWidth = getCardWidth();
    const imageName = normalizeUrl(day.icon);
    return <View key={day.weekday} style={stylesToday(cardWidth).dayWrapper}>
        <Text style={stylesToday().dayText}>{day.weekday}</Text>
        <Text style={stylesToday().temperatureText}><Text style={stylesToday().maxMinText}>max.</Text> {day.max} <Text style={stylesToday().maxMinText}>/ min.</Text> {day.min}</Text>
        <NativeDrawable source={imageName} style={stylesToday(cardWidth).dayIcon} />
      </View>
  }

  displayDay(day) {
    const cardWidth = getCardWidth();
    const imageName = normalizeUrl(day.icon);
    return <View key={day.weekday} style={stylesDay(cardWidth).dayWrapper}>
        <Text style={stylesDay().dayText}>{day.weekday}</Text>
        <Text style={stylesDay().temperatureText}><Text style={stylesDay().maxMinText}>max.</Text> {day.max} <Text style={stylesDay().maxMinText}>/ min.</Text> {day.min}</Text>
        <NativeDrawable source={imageName} style={stylesDay(cardWidth).dayIcon} />
      </View>
  }

  render() {
    const data = this.props.data;
    const today = {
      max: data.todayMax,
      min: data.todayMin,
      weekday: data.todayWeekday,
      icon: data.todayIcon,
    };

    return (
      <View>
        <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', ...elementTopMargin }}>
          <View style={styles.containerToday}>
            { this.displayToday(today) }
          </View>
          <View style={styles.tableDays}>
            { data.forecast.map(this.displayDay) }
          </View>
        </View>
        <MoreOn
          provider='weatherunderground.com'
          url='http://www.weatherunderground.com'
        />
      </View>
    );
  }
}

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
