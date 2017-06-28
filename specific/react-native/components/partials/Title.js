import React from 'react';
import { StyleSheet, View, Text } from 'react-native';


class Title extends React.Component {

  render() {
    return <Text numberOfLines={2} style={style(false).title}>{this.props.title}</Text>;
  }
}

const style = function (isHistory) {
  return StyleSheet.create({
    title: {
      color: 'black',
      fontWeight: 'bold',
      fontSize: 15,
      marginTop: 10,
    }
  });
}

export default Title;