import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getMessage } from '../../../core/i18n';
import { elementTopMargin, elementSideMargins } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create(
  {
    container: {
      ...elementTopMargin,
      ...elementSideMargins,
    },
    text: {
      color: themeDetails[theme].textColor,
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
      backgroundColor: themeDetails[theme].lotto.highlightColor
    },
    subText: {
      color: themeDetails[theme].lotto.subText,
      fontSize: 12
    }
  }
);

export default class Lotto extends React.Component {
  constructor(props) {
    super(props);
    this.data = this.props.data;
  }

  get6aus49Results() {
    const theme = this.props.theme;
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
          style_all: [styles(theme).circle],
          style_first: [styles(theme).circle],
          style_last: [styles(theme).circle, styles(theme).highlight],
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
          text_style_first: [styles(theme).bold],
        },
      },
      {
        result: ['Super6'].concat(super6.gewinnzahlen.split('')),
        styles: {
          style_all: [],
          style_first: [],
          style_last: [],
          text_style_first: [styles(theme).bold],
        },
      },
    ];
  }

  getEurojackpotResults() {
    const ej = this.lottoList.ej;
    const theme = this.props.theme;

    if (!ej) {
      return [];
    }

    return [
      {
        result: ej.gewinnzahlen,
        styles: {
          style_all: [styles(theme).circle],
          style_first: [styles(theme).circle],
          style_last: [styles(theme).circle],
          text_style_first: [],
        },
        description: 'lotto_5aus50',
      },
      {
        result: ej.zwei_aus_acht,
        styles: {
          style_all: [styles(theme).circle],
          style_first: [styles(theme).circle],
          style_last: [styles(theme).circle],
          text_style_first: [],
        },
        description: 'lotto_2aus8',
      },
    ];
  }

  getKenoResults() {
    const keno = this.lottoList.keno;
    const plus5 = this.lottoList.plus5;
    const theme = this.props.theme;

    return [
      {
        result: keno.gewinnzahlen.slice(0, 10),
        styles: {
          style_all: [styles(theme).square],
          style_first: [styles(theme).square],
          style_last: [styles(theme).square],
          text_style_first: [],
        },
      },
      {
        result: keno.gewinnzahlen.slice(10, 20),
        styles: {
          style_all: [styles(theme).square],
          style_first: [styles(theme).square],
          style_last: [styles(theme).square],
          text_style_first: [],
        },
      },
      {
        result: ['plus5'].concat(plus5.gewinnzahlen.split('')),
        styles: {
          style_all: [],
          style_first: [],
          style_last: [],
          text_style_first: [styles(theme).bold],
        },
      },
    ];
  }

  getGlueckspiraleResults() {
    const gs = this.lottoList.gs;
    const theme = this.props.theme;

    if (!gs) {
      return [];
    }

    return [
      {
        result: gs.gewinnzahlen[6][0].split(''),
        styles: {
          style_all: [styles(theme).square],
          style_first: [styles(theme).square],
          style_last: [styles(theme).square],
          text_style_first: [],
        },
        description: 'lotto_gewinnklasse7',
      },
      {
        result: gs.gewinnzahlen[6][1].split(''),
        styles: {
          style_all: [styles(theme).square],
          style_first: [styles(theme).square],
          style_last: [styles(theme).square],
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
    const theme = this.props.theme;
    const size = numbers.length;
    return (
      <View style={styles(theme).result_container}>
        <View
          accessible={false}
          accessibilityLabel="lotto-row"
          style={styles(theme).number_container}
        >
          {
            numbers.map((number, index) => {
              const key = `${number}${index}`;
              let viewStyle = [styles(theme).normal, { marginRight: 5 }];
              let textStyle = [styles(theme).text];
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
              return (
                <View
                  accessible={false}
                  accessibilityLabel="lotto-element"
                  style={viewStyle}
                  key={key}
                >
                  <Text style={textStyle}>{number}</Text>
                </View>
              );
            })
          }
          <View
            accessible={false}
            accessibilityLabel="lotto-desc"
          >
            <Text style={[styles(theme).subText, { marginTop: 5 }]}>{getMessage(description)}</Text>
          </View>
        </View>
      </View>
    );
  }

  renderResult({ result, description, styles: st }) {
    return (
      <View key={result.toString()}>
        {this.renderRow(result, description, st)}
      </View>
    );
  }

  render() {
    const lottoResults = this.lottoResults;
    const theme = this.props.theme;
    if (!lottoResults) {
      return null;
    }

    const results = lottoResults.map((...args) => this.renderResult(...args));
    return (
      <View style={styles(theme).container}>
        <View
          accessible={false}
          accessibilityLabel="lotto-header"
        >
          <Text style={styles(theme).subText}>
            {`${getMessage('lotto_gewinnzahlen')} • ${this.localeDate}`}
          </Text>
        </View>
        <View
          accessible={false}
          accessibilityLabel="lotto-result"
        >
          {results}
        </View>
      </View>
    );
  }
}
