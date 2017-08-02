import React from 'react';
import { StyleSheet, View, Text, TouchableHighlight } from 'react-native';

import PoweredByKicker from '../partials/PoweredByKicker';


export default class extends React.Component {


  get header() {
    const data = this.props.data;
    return <View style={styles.header}>
      <Text style={[styles.narrow, styles.tableHeader]}>{data.info_list[0]}</Text>
      <Text style={[styles.wide, styles.tableHeader]}>{data.info_list[1]}</Text>
      <Text style={[styles.narrow, styles.tableHeader]}>{data.info_list[2]}</Text>
      <Text style={[styles.narrow, styles.tableHeader]}>{data.info_list[8]}</Text>
      <Text style={[styles.narrow, styles.tableHeader]}>{data.info_list[9]}</Text>
    </View>
  }
  get ranking() {
    const data = this.props.data;
    return data.ranking.map(row =>
      <View style={styles.header} key={row.club}>
        <Text style={[styles.narrow, styles.tableBody]}>{row.rank}</Text>
        <Text style={[styles.wide, styles.tableBody]}>{row.club}</Text>
        <Text style={[styles.narrow, styles.tableBody]}>{row.SP}</Text>
        <Text style={[styles.narrow, styles.tableBody]}>{row.TD}</Text>
        <Text style={[styles.narrow, styles.tableBody]}>{row.PKT}</Text>
      </View>
    );
  }

  render() {
    const data = this.props.data;
    // powered by
    return <View>
      <TouchableHighlight>
        <View style={styles.container}>
          { this.header }
          { this.ranking }
        </View>
      </TouchableHighlight>
      <PoweredByKicker />
    </View>
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    marginTop: 2,
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
  },
  narrow: {
    flex: 1
  },
  wide: {
    flex: 3,
  },
  tableHeader: {
    color: 'black',
    fontWeight: 'bold',
  },
  tableBody: {
    color: 'black',
  }
});