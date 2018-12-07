import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { getCardWidth, elementTopMargin } from '../../styles/CardStyle';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import MoreOn from '../partials/MoreOn';
import themeDetails from '../../themes';

const styles = StyleSheet.create({
  tableDays: {
    flex: 1,
    justifyContent: 'space-around',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});


const stylesToday = (cardWidth = 0, theme) => StyleSheet.create({
  dayText: {
    color: themeDetails[theme].weather.dayTxtColor,
    fontSize: 17,
    fontWeight: '200',
    paddingBottom: 4,
  },
  temperatureText: {
    color: themeDetails[theme].weather.tempTxtColor,
    fontWeight: 'bold',
    fontSize: 17,
  },
  maxMinText: {
    color: themeDetails[theme].weather.maxMinTxtColor,
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

const stylesDay = (cardWidth = 0, theme) => StyleSheet.create({
  temperatureText: {
    color: themeDetails[theme].weather.tempTxtColor,
    fontWeight: 'bold',
    fontSize: 15,
  },
  dayText: {
    color: themeDetails[theme].weather.dayTxtColor,
    fontSize: 15,
    fontWeight: '200',
    paddingBottom: 4,
  },
  maxMinText: {
    color: themeDetails[theme].weather.maxMinTxtColor,
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
        accessibilityLabel="weather-item"
        key={day.weekday}
        style={style.dayWrapper}
      >
        <View
          accessible={false}
          accessibilityLabel="weather-day"
        >
          <Text style={style.dayText}>{day.weekday}</Text>
        </View>
        <View
          accessible={false}
          accessibilityLabel="weather-temp"
        >
          <Text style={style.temperatureText}>
            <Text style={style.maxMinText}>max.</Text>
            {` ${day.max} `}
            <Text style={style.maxMinText}>/ min.</Text>
            {` ${day.min}`}
          </Text>
        </View>
        <View
          accessible={false}
          accessibilityLabel="weather-icon"
          style={style.dayIcon}
        >
          <NativeDrawable source={imageName} style={style.dayIcon} />
        </View>
      </View>
    );
  }

  render() {
    const data = this.props.data;
    const theme = this.props.theme;
    const today = {
      max: data.todayMax,
      min: data.todayMin,
      weekday: data.todayWeekday,
      icon: data.todayIcon,
    };
    const cardWidth = getCardWidth();
    const todayStyle = stylesToday(cardWidth, theme);
    const dayStyle = stylesDay(cardWidth, theme);

    return (
      <View>
        <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', ...elementTopMargin }}>
          { this.displayDay(today, todayStyle) }
          <View style={styles.tableDays}>
            { data.forecast.map(day => this.displayDay(day, dayStyle)) }
          </View>
        </View>
        <MoreOn
          provider="weatherunderground.com"
          url="http://www.weatherunderground.com"
          theme={theme}
        />
      </View>
    );
  }
}
