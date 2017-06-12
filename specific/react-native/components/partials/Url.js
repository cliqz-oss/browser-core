import React from 'react';
import { StyleSheet, View, Text } from 'react-native';


class Url extends React.Component {

  render() {  
    return <Text numberOfLines={3} style={style(false).url}>{this.props.url}</Text>
  }
}

const style = function (isHistory) {
  return StyleSheet.create({
    url: {
      color: 'blue',
      marginRight: 50, // width of icon ???
      marginLeft: 10,
    }
  });
}

export default Url;