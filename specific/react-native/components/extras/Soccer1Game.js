import React from 'react';
import { StyleSheet, View, Text, TouchableHighlight } from 'react-native';

import Link from '../Link';
import PoweredByKicker from '../partials/PoweredByKicker';

export default class extends React.Component {

  get gameStatus() {
    const data = this.props.data;
    if (data.isLive) {
      return <View>
        <Text style={styles.details}>{data.scored}</Text>
        <Text style={styles.details}>live</Text>
      </View>
    } else if (data.scored) {
      return <Text style={styles.details}>{data.scored}</Text>
    } else {
      return <Text style={styles.details}>vs.</Text>
    }
  }

  render() {
    const data = this.props.data;
    return <Link to={data.live_url}>
      <View style={styles.container}>
        <Text style={styles.header}>{data.spielTag}</Text>
        <Text>{data.gameTime} - {data.location}</Text>
        <View style={styles.body}>
          <Text style={styles.details}>{data.HOST}</Text>
          { this.gameStatus }
          <Text style={styles.details}>{data.GUESS}</Text>
        </View>
        <PoweredByKicker />
      </View>
    </Link>
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14,
  },
  body: {
    marginTop: 2,
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  details: {
    marginTop: 2,
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14,
  }
});