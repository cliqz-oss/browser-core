import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';

class Title extends React.Component {

  render() {
    const meta = this.props.meta;
    const color = this.props.isHistory ? '#551A8B' : 'black';
    return <View style={style(color).container}>
        <Text numberOfLines={2} style={style(color).title}>
          {this.props.title}
        </Text>
        { !!meta &&
          <Text numberOfLines={1} style={style(color).meta}>
            {meta}
          </Text>
        }
      </View>;
  }
}

const style = function (color) {
  return StyleSheet.create({
    container: {
      ...elementSideMargins,
      ...elementTopMargin,
    },
    title: {
      color,
      fontWeight: 'bold',
      fontSize: 15,
    },
    meta: {
      color: '#448100',
      fontSize: 10,
    }
  });
}

export default Title;
