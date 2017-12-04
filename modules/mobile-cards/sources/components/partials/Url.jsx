import React from 'react';
import { StyleSheet, View, Text } from 'react-native';


class Url extends React.Component {

  render() {
    return <Text numberOfLines={3} style={style(this.props.isHistory).url}>{this.props.url}</Text>
  }
}

const style = function (isHistory) {
  const color = isHistory ? '#551A8B' : '#4A90E2';
  return StyleSheet.create({
    url: {
      color,
      marginRight: 50, // width of icon ???
      marginLeft: 10,
      fontSize: 11,
      fontWeight: '100',
    }
  });
}

export default Url;
