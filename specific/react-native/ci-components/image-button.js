"use strict";

import React from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';

export default class ImageButton extends React.Component {
  constructor(props: {}) {
    super(props);

    this.state = {
      image: this.props.appearance.normal
    };
  }

  onTouchStart() {
    this.setState({
      image: this.props.appearance.highlight
    });
  }

  onTouchEnd() {
    this.setState({
      image: this.props.appearance.normal
    }, () => {
      if (this.props.onPress) {
        setTimeout(this.props.onPress);
      }
    });
  }

  onTouchCancel() {
    if (typeof this.props.appearance.normal === "string") {
      // url
      this.setState({
        image: {uri: this.props.appearance.normal}
      });
    } else if (this.props.appearance.normal) {
      this.setState({
        image: this.props.appearance.normal
      });
    }

  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      image: nextProps.appearance.normal
    });
  }

  render() {
    const imgSize = this.props.size;
    const buttonSize = this.props.style.width;
    const borderRad = this.props.style.borderRadius || 0;
    const padding = (buttonSize - imgSize)/2;
    return (
      <View style={ this.props.style }
            onStartShouldSetResponder={ () => true }
            onResponderGrant={ this.onTouchStart.bind(this) }
            onResponderRelease={ this.onTouchEnd.bind(this) }
            onResponderTerminate={ this.onTouchCancel.bind(this) }
            onResponderReject={ this.onTouchCancel.bind(this) }>
        <Image style={{flex: 1, alignSelf:'center', width: imgSize, height: imgSize, borderRadius: borderRad}} source={ this.state.image } resizeMode='contain'/>
      </View>
    );
  }
}

let styles = StyleSheet.create({
  image: {
    flex: 1,
    width: 25,
    height: 25,
  }
});
