import React from 'react';
import { StyleSheet, View, Text, TouchableHighlight } from 'react-native';
import { vpWidth, vpHeight } from '../styles/CardStyle';

import PoweredByKicker from './partials/PoweredByKicker';

export default class extends React.Component {

  render() {
    return <View>
      { this.content }
      <PoweredByKicker />
    </View>
  }
}

const styles = StyleSheet.create({
  
});