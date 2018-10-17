import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getCardWidth } from '../../styles/CardStyle';

const style = (color, oneLine) => StyleSheet.create({
  url: {
    color,
    width: getCardWidth() - 95, // width of icon + margins
    marginLeft: 5,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '400',
  },
  container: {
    maxHeight: oneLine ? 13 : 39,
    overflow: 'hidden',
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
    <View style={style(color, oneLine).container}>
      <Text
        accessible={false}
        accessibilityLabel={'generic-link'}
        numberOfLines={oneLine ? 1 : 3}
        style={style(color, oneLine).url}
      >
        {url}
      </Text>
    </View>
  );
}
