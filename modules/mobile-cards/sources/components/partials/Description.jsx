import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { elementSideMargins, elementTopMargin, descriptionTextColor } from '../../styles/CardStyle';

const style = color => StyleSheet.create({
  description: {
    ...elementSideMargins,
    ...elementTopMargin,
    color,
    textAlign: 'left',
    fontSize: 16,
    lineHeight: 19,
  }
});

export default function (props) {
  const color = props.isHistory ? '#551A8B' : descriptionTextColor;
  return (
    <Text
      accessible={false}
      accessibilityLabel={'generic-desc'}
      numberOfLines={10}
      style={style(color).description}
    >
      {props.description}
    </Text>
  );
}
