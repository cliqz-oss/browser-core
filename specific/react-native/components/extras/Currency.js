import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import i18n, { getMessage } from '../../modules/core/i18n';
import Title from '../partials/Title';
import Link from '../Link';


export default class extends React.Component {

  format(number, currency) {
    return Number(number).toLocaleString(i18n.currLocale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  }

  displayTableRow(coefficient) {
    const data = this.props.data;
    return <View style={styles.table} key={coefficient}>
      <Text style={styles.body}>
        {this.format(coefficient * data.multiplyer, data.fromCurrency)}
      </Text>
      <Text style={styles.body}>=</Text>
      <Text style={styles.body}>
        {this.format(coefficient * data.mConversionRate, data.toCurrency)}
      </Text>
    </View>
  }

  render() {
    const data = this.props.data;
    const title = `${data.toSymbol} ${data.toAmount.main} ${data.toCurrency}`;
    return <Link actionName='mobile-search:copyValue' actionParams={[ data.toAmount.main ]}>
      <View style={styles.container}>
        <Title title={title} meta={ getMessage('no_legal_disclaimer') } />
        { [1, 10, 50, 100, 200, 500, 1000].map(this.displayTableRow.bind(this)) }
      </View>
    </Link>
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  table: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  body: {
    color: 'black',
    flex: 1,
  },
});