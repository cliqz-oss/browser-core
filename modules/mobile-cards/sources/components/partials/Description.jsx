import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { elementSideMargins, elementTopMargin, descriptionTextColor } from '../../styles/CardStyle';

class Description extends React.Component {

  render() {
    const color = this.props.isHistory ? '#551A8B' : descriptionTextColor;
    return <Text numberOfLines={10} style={style(color).description}>{this.props.description}</Text>;
  }
}

const style = color => StyleSheet.create({
  description: {
    ...elementSideMargins,
    ...elementTopMargin,
    color,
    textAlign: 'left',
    fontSize: 14,
    lineHeight: 19,
  }
});

export default Description;
