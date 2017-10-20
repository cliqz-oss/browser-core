import React from 'react';
import { StyleSheet, TouchableHighlight, Image, View } from 'react-native';
import NativeDrawable from '../custom/NativeDrawable';


export default class extends React.Component {
  
  constructor(props) {
    super(props);
  }

  render() {
    if (!this.props.data || !this.props.data.length) {
      return null;
    }
    return <View style={styles.streaming} >
      {this.props.data.slice(0, 3).map(this.displayLink)}
    </View>
  }

  displayLink(link) {
    const imageName = link.image.slice(link.image.lastIndexOf('/') + 1, -4);
    return <TouchableHighlight key={link.url}>
      <NativeDrawable
        src={'ic_ez_' + imageName}
        style={styles.image} />
    </TouchableHighlight>
  }
}


const styles = StyleSheet.create({
  streaming: {
    flex: 1,
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    flexDirection: 'row',
    marginTop: 5,
  },
  image: {
    margin: 5,
    width: 80,
    height: 20,
  }
});