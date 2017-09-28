import React from 'react';
import { StyleSheet, View, Text, TouchableHighlight } from 'react-native';

import { getMessage } from '../../modules/core/i18n';
import Title from '../partials/Title';
import Link from '../Link';


export default class extends React.Component {

  render() {
    const data = this.props.data;
    return <Link actionName='copyvalue' actionParams={[ data.answer ]}>
      <View>
        <Title title={getMessage('calculator')} />
        <Text style={styles.body}>{data.answer}</Text>
        <Text style={styles.body}>{data.expression}</Text>
        <Text style={styles.copy}>{getMessage('mobile_calc_copy_ans')}</Text>
      </View>
    </Link>
  }
}

const styles = StyleSheet.create({
  body: {
    color: 'black',
  },
  copy: {
    color: '#CECECE',
    alignSelf: 'center',
  }
});