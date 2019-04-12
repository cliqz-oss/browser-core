import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getMessage } from '../../../core/i18n';
import Link from '../Link';
import Icon from './Icon';
import { elementTopMargin } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create({
  container: {
    ...elementTopMargin,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    marginLeft: 10,
    color: themeDetails[theme].soccer.subText,
  },
});

export default function ({ logo, theme }) {
  // powered by
  return (
    <Link label="powered-by" url="http://www.kicker.de/?gomobile=1">
      <View style={styles(theme).container}>
        <View
          accessible={false}
          accessibilityLabel="powered-by-icon"
        >
          <Icon logoDetails={logo} width={20} height={20} />
        </View>
        <View
          accessible={false}
          accessibilityLabel="powered-by-text"
        >
          <Text style={styles(theme).text}>{getMessage('kicker_sponsor')}</Text>
        </View>
      </View>
    </Link>
  );
}
