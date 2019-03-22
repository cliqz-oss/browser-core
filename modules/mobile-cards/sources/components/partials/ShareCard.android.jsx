import React from 'react';
import { View } from 'react-native';

export default props => (
  <View style={[props.style || {}]}>
    { props.children }
    <View style={{ padding: 5 }} />
  </View>
);
