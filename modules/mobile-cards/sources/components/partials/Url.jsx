import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { getDetailsFromUrl } from '../../../core/url';

const style = color => StyleSheet.create({
  url: {
    color,
    marginRight: 50, // width of icon ???
    marginLeft: 10,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '300',
  }
});

export default function (props) {
  const url = props.url;
  const oneLine = props.oneLine;
  let color = props.isHistory ? '#551A8B' : '#4A90E2';
  color = props.color || color;
  if (!url || url === 'n/a') {
    return null;
  }
  const urlDetails = getDetailsFromUrl(url);
  return (
    <Text
      numberOfLines={oneLine ? 1 : 3}
      style={style(color).url}
    >
      {urlDetails.friendly_url || url}
    </Text>
  );
}
