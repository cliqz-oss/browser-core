import React from 'react';
import { StyleSheet, View, Text, TouchableHighlight } from 'react-native';

import { getMessage } from '../../modules/core/i18n';
import Link from '../Link';
import Icon from './Icon';


export default class extends React.Component {


  render() {
    const data = this.props.data;
    // powered by
    return <Link to='http://www.kicker.de/?gomobile=1'>
      <View style={styles.container}>
        <Icon url='kicker.de' width={20} height={20} />
        <Text style={styles.text}>{getMessage('KickerSponsor')}</Text>
      </View>
    </Link>
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    marginLeft: 5,
    color: '#999',
  },
});