import React from 'react';
import { StyleSheet, View, Text, ListView, TouchableHighlight } from 'react-native';
import moment from 'moment';

export default class extends React.Component {

  constructor(props) {
    super(props);
    const ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });
    this.state = {
      dataSource: this.props.dataSource,
    };
  }

  render() {
    const renderRow = this._renderRow.bind(this);
    return (
      <View style={styles.container}>
        <Text style={styles.listTitle}>{this.props.title}</Text>
        <ListView
          horizontal={true}
          contentContainerStyle={styles.list}
          dataSource={this.props.dataSource}
          pageSize={4}
          renderRow={renderRow}
          enableEmptySections={true}
        />
      </View>
    );
  }

  _renderRow(item) {
    const when = item.date ? moment(item.date).fromNow() : '';
    return (
    <TouchableHighlight onPress={() => this.props.onClick(item)}>
      <View style={styles.row}>
        <Text ellipsizeMode={'tail'} numberOfLines={3}>{item.title}</Text>
        <Text>{when}</Text>
      </View>
    </TouchableHighlight>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 4
  },
  list: {
    justifyContent: 'space-around',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start'
  },
  row: {
    justifyContent: 'center',
    margin: 3,
    width: 100,
    height: 100,
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    borderColor: '#CCC'
  },
  listTitle: {
    marginLeft: 10,
    marginTop: 4,
    marginBottom: 6
  }
});
