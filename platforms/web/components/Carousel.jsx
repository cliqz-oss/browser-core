import { View } from 'react-native';
import React from 'react';


export default function (props) {
  return (
    <View style={{ flexDirection: 'row', width: props.sliderWidth }}>
      {props.data.map(x =>
        <View style={{width: props.itemWidth}} >
          {props.renderItem({ item: x })}
        </View>
      )}
    </View>
  );
};

