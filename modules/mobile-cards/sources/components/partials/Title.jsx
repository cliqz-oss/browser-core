import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';

const style = color => StyleSheet.create({
  container: {
    ...elementSideMargins,
    ...elementTopMargin,
  },
  title: {
    color,
    fontWeight: 'bold',
    fontSize: 17,
  },
  meta: {
    color: '#448100',
    fontSize: 10,
  }
});

export default function (props) {
  const meta = props.meta;
  const color = props.isHistory ? '#551A8B' : 'black';
  return (
    <View
      accessible={false}
      accessibilityLabel={'generic-title'}
      style={style(color).container}
    >
      <Text numberOfLines={2} style={style(color).title}>
        {props.title}
      </Text>
      { !!meta &&
        <Text numberOfLines={1} style={style(color).meta}>
          {meta}
        </Text>
      }
    </View>
  );
}
