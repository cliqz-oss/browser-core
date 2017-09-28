import React from 'react';
import { StyleSheet, View, Text, TouchableHighlight } from 'react-native';
import { cardWidth } from '../../styles/CardStyle';
import VectorDrawable from '../custom/VectorDrawable';

export default class extends React.Component {

  displayDay(day) {
    const imageName = day.icon.slice(day.icon.lastIndexOf('/') + 1, -4).replace(/-/g, '_');
    return <View key={day.weekday} style={styles.dayWrapper}>
        <Text style={styles.text}>{day.weekday}</Text>
        <Text style={styles.text}>max.  {day.max} / min. {day.min}</Text>
        <VectorDrawable src={imageName} style={styles.dayIcon} />
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

    return <View>
      <View style={styles.container}>
        { this.displayDay(today) }
      </View>
      <View style={styles.container}>
        { data.forecast.map(this.displayDay) }
      </View>
    </View>
  }
}

const styles = StyleSheet.create({
  text: {
    color: 'black',
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