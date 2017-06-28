import React from 'react';
import { StyleSheet, View, Text } from 'react-native';


class Description extends React.Component {

  render() {
    return <Text numberOfLines={10} style={style.description}>{this.props.description}</Text>;
  }
}

const style = StyleSheet.create({
    description: {
      color: 'black',
      marginTop: 5,
    }
  });

export default Description;