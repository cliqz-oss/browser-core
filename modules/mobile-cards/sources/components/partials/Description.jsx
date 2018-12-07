import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const style = theme => StyleSheet.create({
  description: {
    ...elementSideMargins,
    ...elementTopMargin,
    color: themeDetails[theme].textColor,
    textAlign: 'left',
    fontSize: 16,
    lineHeight: 19,
  }
});

export default function (props) {
  return (
    <Text
      accessible={false}
      accessibilityLabel="generic-desc"
      numberOfLines={10}
      style={style(props.theme).description}
    >
      {props.description}
    </Text>
  );
}
