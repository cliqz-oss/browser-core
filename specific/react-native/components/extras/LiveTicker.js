import React from 'react';
import { StyleSheet, View, Text, TouchableHighlight } from 'react-native';
import { vpWidth, vpHeight } from '../../styles/CardStyle';

import Link from '../Link';
import SoccerComponent from '../SoccerComponent';

export default class extends SoccerComponent {


  displayMatches(matches) {
    return (
      matches.map((match, index) =>
        <Link to={match.live_url} key={index}>
          <View style={styles.gameContainer}>
            <Text style={styles.gameText}>{ match.HOST }</Text>
            <Text style={styles.gameText}>{ match.scored } { match.gameTimeHour }</Text>
            <Text style={styles.gameText}>{ match.GUESS }</Text>
          </View>
        </Link>
      )
    );
  }

  displayMatchDay(matchDay, index) {
    return <View key={index}>
      <Text style={styles.headerText}>{ matchDay.date }</Text>
      <View style={styles.matchesView}>
        { this.displayMatches(matchDay.matches) }
      </View>
    </View>
  }

  get content() {
    const data = this.props.data;
    const matchList = (data.matches || []).map(this.displayMatchDay.bind(this));
      
    return <View style={styles.container}>
        { matchList }
      </View>
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
  },
  headerText: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: 'bold',
    color: 'black',
  },
  matchesView: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  gameContainer: {
    width: vpWidth / 2.5,
    height: vpWidth / 2.5,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  gameText: {
    color: 'black',
    fontSize: 15,
  }
});