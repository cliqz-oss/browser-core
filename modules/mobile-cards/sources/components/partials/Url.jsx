import React from 'react';
import { StyleSheet, Text } from 'react-native';

const style = color => StyleSheet.create({
  url: {
    color,
    marginRight: 50, // width of icon ???
    marginLeft: 5,
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
  return (
    <Text
      accessible={false}
      accessibilityLabel={'generic-link'}
      numberOfLines={oneLine ? 1 : 3}
      style={style(color).url}
    >
      {url}
    </Text>
  );
}
