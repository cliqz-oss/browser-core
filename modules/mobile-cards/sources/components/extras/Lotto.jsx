import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getMessage } from '../../../core/i18n';
import { elementTopMargin, elementSideMargins } from '../../styles/CardStyle';

const styles = StyleSheet.create(
  {
    container: {
      ...elementTopMargin,
      ...elementSideMargins,
    },
    text: {
      color: 'black',
      fontSize: 15,
    },
    bold: {
      fontWeight: 'bold'
    },
    result_container: {
      flexDirection: 'column',
      justifyContent: 'flex-start',
      marginTop: 5,
    },
    number_container: {
      flexDirection: 'row',
      alignContent: 'center',
      flexWrap: 'wrap',
    },
    normal: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    square: {
      height: 30,
      width: 30,
      borderColor: 'black',
      borderWidth: 1,
      marginTop: 3,
    },
    circle: {
      height: 30,
      width: 30,
      borderRadius: 15,
      borderColor: '#BBBBBB',
      borderWidth: 1,
    },
    highlight: {
      height: 30,
      width: 30,
      backgroundColor: '#eee'
    }
  }
);

export default class Lotto extends React.Component {
  constructor(props) {
    super(props);
    this.data = this.props.data;
  }

  get6aus49Results() {
    const lotto = this.lottoList.lotto;
    const spiel77 = this.lottoList.spiel77;
    const super6 = this.lottoList.super6;

    if (!lotto || !spiel77 || !super6) {
      return [];
    }

    return [
      {
        result: lotto.gewinnzahlen.concat(lotto.superzahl),
        styles: {
          style_all: [styles.circle],
          style_first: [styles.circle],
          style_last: [styles.circle, styles.highlight],
          text_style_first: [{ fontWeight: 'bold' }],
          text_style_last: [{ fontWeight: 'bold' }],
          text_style_all: [{ fontWeight: 'bold' }],
        },
        description: 'lotto_superzahl',
      },
      {
        result: ['Spiel77'].concat(spiel77.gewinnzahlen.split('')),
        styles: {
          style_all: [],
          style_first: [],
          style_last: [],
          text_style_first: [styles.bold],
        },
      },
      {
        result: ['Super6'].concat(super6.gewinnzahlen.split('')),
        styles: {
          style_all: [],
          style_first: [],
          style_last: [],
          text_style_first: [styles.bold],
        },
      },
    ];
  }

  getEurojackpotResults() {
    const ej = this.lottoList.ej;

    if (!ej) {
      return [];
    }

    return [
      {
        result: ej.gewinnzahlen,
        styles: {
          style_all: [styles.circle],
          style_first: [styles.circle],
          style_last: [styles.circle],
          text_style_first: [],
        },
        description: 'lotto_5aus50',
      },
      {
        result: ej.zwei_aus_acht,
        styles: {
          style_all: [styles.circle],
          style_first: [styles.circle],
          style_last: [styles.circle],
          text_style_first: [],
        },
        description: 'lotto_2aus8',
      },
    ];
  }

  getKenoResults() {
    const keno = this.lottoList.keno;
    const plus5 = this.lottoList.plus5;
    return [
      {
        result: keno.gewinnzahlen.slice(0, 10),
        styles: {
          style_all: [styles.square],
          style_first: [styles.square],
          style_last: [styles.square],
          text_style_first: [],
        },
      },
      {
        result: keno.gewinnzahlen.slice(10, 20),
        styles: {
          style_all: [styles.square],
          style_first: [styles.square],
          style_last: [styles.square],
          text_style_first: [],
        },
      },
      {
        result: ['plus5'].concat(plus5.gewinnzahlen.split('')),
        styles: {
          style_all: [],
          style_first: [],
          style_last: [],
          text_style_first: [styles.bold],
        },
      },
    ];
  }

  getGlueckspiraleResults() {
    const gs = this.lottoList.gs;

    if (!gs) {
      return [];
    }

    return [
      {
        result: gs.gewinnzahlen[6][0].split(''),
        styles: {
          style_all: [styles.square],
          style_first: [styles.square],
          style_last: [styles.square],
          text_style_first: [],
        },
        description: 'lotto_gewinnklasse7',
      },
      {
        result: gs.gewinnzahlen[6][1].split(''),
        styles: {
          style_all: [styles.square],
          style_first: [styles.square],
          style_last: [styles.square],
          text_style_first: [],
        },
        description: 'lotto_gewinnklasse7',
      },
    ];
  }

  get currentLottoType() {
    return this.data.lotto_type || 'unknown';
  }

  get lottoList() {
    const key = Object.keys(this.data.lotto_list)[0];
    return this.data.lotto_list[key] || {};
  }

  get locale() {
    return getMessage('locale_lang_code');
  }

  get localeDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
    const date = this.lottoList.date;
    if (date) {
      return new Date(date).toLocaleDateString(this.locale, options);
    }
    return '';
  }

  get lottoResults() {
    switch (this.currentLottoType) {
      case '6aus49':
        return this.get6aus49Results();
      case 'eurojackpot':
        return this.getEurojackpotResults();
      case 'keno':
        return this.getKenoResults();
      case 'glueckspirale':
        return this.getGlueckspiraleResults();
      default:
        return [];
    }
  }

  renderRow(numbers, description, rowStyles) {
    const size = numbers.length;
    return (<View style={styles.result_container}>
      <View
        accessible={false}
        accessibilityLabel={'lotto-row'}
        style={styles.number_container}
      >
        {
          numbers.map((number, index) => {
            const key = `${number}${index}`;
            let viewStyle = [styles.normal, { marginRight: 5 }];
            let textStyle = [styles.text];
            if (index === 0) {
              viewStyle = viewStyle.concat(rowStyles.style_first);
              textStyle = textStyle.concat(rowStyles.text_style_first);
            } else if (index === size - 1) {
              viewStyle = viewStyle.concat(rowStyles.style_last);
              textStyle = textStyle.concat(rowStyles.text_style_last);
            } else {
              viewStyle = viewStyle.concat(rowStyles.style_all);
              textStyle = textStyle.concat(rowStyles.text_style_all);
            }
            return (<View
              accessible={false}
              accessibilityLabel={'lotto-element'}
              style={viewStyle}
              key={key}
            >
              <Text style={textStyle}>{number}</Text>
            </View>);
          })
        }
        <View
          accessible={false}
          accessibilityLabel={'lotto-desc'}
        >
          <Text style={[styles.text, { marginTop: 5, color: '#565656', fontSize: 12 }]}>{getMessage(description)}</Text>
        </View>
      </View>
    </View>);
  }

  renderResult({ result, description, styles: st }) {
    return (<View key={result.toString()}>
      {this.renderRow(result, description, st)}
    </View>);
  }

  render() {
    const lottoResults = this.lottoResults;
    if (!lottoResults) {
      return null;
    }
    const results = lottoResults.map((...args) => this.renderResult(...args));
    return (<View style={styles.container}>
      <View
        accessible={false}
        accessibilityLabel={'lotto-header'}
      >
        <Text style={{ color: '#565656', fontSize: 12 }}>{getMessage('lotto_gewinnzahlen')} &#8226; {this.localeDate}</Text>
      </View>
      <View
        accessible={false}
        accessibilityLabel={'lotto-result'}
      >
        {results}
      </View>
    </View>);
  }
}
