import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import i18n, { getMessage } from '../../../core/i18n';
import Title from '../partials/Title';
import MoreOn from '../partials/MoreOn';
import TapToCopy from '../partials/TapToCopy';
import Link from '../Link';
import { elementTopMargin, elementSideMargins } from '../../styles/CardStyle';


export default class extends React.Component {

  format(number, currency) {
    return Number(number).toLocaleString(i18n.currLocale, {
      style: 'currency',
      currency: currency,
      useGrouping: false,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  }

  render() {
    const data = this.props.data;
    const array = [1, 10, 50, 100, 200, 500, 1000];
    const title = `${data.toSymbol} ${data.toAmount.main} ${data.toCurrency}`;
    return (
      <View>
        <View style={styles.container}>
          <TapToCopy val={data.toAmount.main}>
            <Title title={title} meta={ getMessage('no_legal_disclaimer') } />
          </TapToCopy>
          <View style={styles.table}>
            <View style={styles.leftColumn}>
              { array.map((coefficient) => 
                  <Text style={[styles.body, { textAlign: 'right' }]} key={coefficient}>
                    {this.format(coefficient * data.multiplyer, data.fromCurrency)}
                  </Text>
                )
              }
            </View>
            <View style={styles.middleColumn}>
              { array.map((coefficient) => 
                  <Text style={styles.body} key={coefficient}>=</Text>
                )
              }
            </View>
            <View style={styles.rightColumn}>
              { array.map((coefficient) => 
                  <Text style={styles.body} key={coefficient}>
                    {this.format(coefficient * data.mConversionRate, data.toCurrency)}
                  </Text>
                )
              }
            </View>
          </View>
        </View>
        <MoreOn
          provider='XE.com'
          url={ `"http://www.xe.com/${getMessage('lang_code')}` }
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  table: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...elementTopMargin,
    ...elementSideMargins,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftColumn: {
  },
  middleColumn: {
    paddingLeft: 10,
    paddingRight: 10,
  },
  rightColumn: {
  },
  body: {
    color: 'black',
  },
});
