import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import utils from '../../../core/utils';


class Url extends React.Component {

  render() {
    const url = this.props.url;
    const oneLine = this.props.oneLine;
    if (!url || url === 'n/a') {
      return null;
    }
    const urlDetails = utils.getDetailsFromUrl(url);
    return (
      <Text
        numberOfLines={oneLine ? 1 : 3}
        style={style(this.props.isHistory).url}
      >
        { urlDetails.friendly_url || url }
      </Text>
    )
  }
}

const style = function (isHistory) {
  const color = isHistory ? '#551A8B' : '#4A90E2';
  return StyleSheet.create({
    url: {
      color,
      marginRight: 50, // width of icon ???
      marginLeft: 10,
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '100',
    }
  });
}

export default Url;
