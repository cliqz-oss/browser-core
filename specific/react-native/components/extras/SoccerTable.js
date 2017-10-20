import React from 'react';
import { StyleSheet, View, Text, TouchableHighlight } from 'react-native';

import SoccerComponent from '../SoccerComponent';


export default class extends SoccerComponent {


  displayHeader(groupName) {
    return <View style={styles.header}>
      <Text style={[styles.wide, styles.tableHeader]}>#</Text>
      <Text style={[styles.wide, styles.tableHeader]}>Mannschaft</Text>
      <Text style={[styles.narrow, styles.tableHeader]}>SP</Text>
      <Text style={[styles.narrow, styles.tableHeader]}>TD</Text>
      <Text style={[styles.narrow, styles.tableHeader]}>PKT</Text>
    </View>
  }

  displayRanking(ranking) {
    return ranking.map(row =>
      <View style={styles.header} key={row.club}>
        <Text style={[styles.narrow, styles.tableBody]}>{row.rank}</Text>
        <Text style={[styles.wide, styles.tableBody]}>{row.club}</Text>
        <Text style={[styles.narrow, styles.tableBody]}>{row.SP}</Text>
        <Text style={[styles.narrow, styles.tableBody]}>{row.TD}</Text>
        <Text style={[styles.narrow, styles.tableBody]}>{row.PKT}</Text>
      </View>
    );
  }

  displayGroup(group) {
    return <View key={group.group || 'key'}>
      { this.displayHeader(group.group) }
      { this.displayRanking(group.ranking) }
    </View>
  }

  get groups() {
    const data = this.props.data;
    if (!data.groups) {
      data.groups = [{ranking: data.ranking}];
    }
    return <View>
      { data.groups.map(this.displayGroup.bind(this)) }
    </View>
  }

  get content() {
    const data = this.props.data;
    return <View>
      <TouchableHighlight>
        <View style={styles.container}>
          { this.groups }
        </View>
      </TouchableHighlight>
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