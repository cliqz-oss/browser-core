import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { getDetailsFromUrl } from '../../../core/url';


class Url extends React.Component {

  render() {
    const url = this.props.url;
    const oneLine = this.props.oneLine;
    let color = this.props.isHistory ? '#551A8B' : '#4A90E2';
    color = this.props.color || color;
    if (!url || url === 'n/a') {
      return null;
    }
    const urlDetails = getDetailsFromUrl(url);
    return (
      <Text
        numberOfLines={oneLine ? 1 : 3}
        style={style(color).url}
      >
        { urlDetails.friendly_url || url }
      </Text>
    )
  }
}

const style = color => StyleSheet.create({
  url: {
    color,
    marginRight: 50, // width of icon ???
    marginLeft: 10,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '100',
  }
});

export default Url;
