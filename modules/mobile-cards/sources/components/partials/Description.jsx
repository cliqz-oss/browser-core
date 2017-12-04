import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { elementSideMargins, elementTopMargin, descriptionTextColor } from '../../styles/CardStyle';

class Description extends React.Component {

  render() {
    return <Text numberOfLines={10} style={style.description}>{this.props.description}</Text>;
  }
}

const style = StyleSheet.create({
  description: {
    ...elementSideMargins,
    ...elementTopMargin,
    color: descriptionTextColor,
    textAlign: 'left',
    fontSize: 14,
    lineHeight: 19,
  }
});

export default Description;
