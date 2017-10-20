import React from 'react';
import { StyleSheet, View, Text } from 'react-native';


class Title extends React.Component {

  render() {
    const meta = this.props.meta;
    return <View>
        <Text numberOfLines={2} style={style(false).title}>
          {this.props.title}
        </Text>
        { !!meta &&
          <Text numberOfLines={1} style={style().meta}>
            {meta}
          </Text>
        }
      </View>;
  }
}

const style = function (isHistory) {
  return StyleSheet.create({
    title: {
      color: 'black',
      fontWeight: 'bold',
      fontSize: 15,
      marginTop: 10,
    },
    meta: {
      color: '#448100',
      fontSize: 10,
    }
  });
}

export default Title;