import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getMessage } from '../../../core/i18n';
import Title from '../partials/Title';
import TapToCopy from '../partials/TapToCopy';
import { elementSideMargins } from '../../styles/CardStyle';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create({
  content: {
    marginTop: 10,
    ...elementSideMargins,
  },
  result: {
    fontSize: 18,
    color: themeDetails[theme].textColor
  },
  input: {
    fontSize: 14,
    color: themeDetails[theme].textColor
  }
});

export default function ({ data, theme }) {
  const Container = data.ez_type ? View : TapToCopy; // copy only calculator answers
  let title = null;
  if (data.ez_type === 'time') {
    title = `${getMessage(data.ez_type)} ${data.location}`;
  }
  const answerToDisplay = data.isRounded ? `≈ ${data.answer}` : `= ${data.answer}`;
  return (
    <Container val={data.answer} theme={theme}>
      {title && <Title title={title} />}
      <View style={styles(theme).content}>
        <View
          accessible={false}
          accessibilityLabel="calc-answer"
        >
          <Text style={styles(theme).result}>{answerToDisplay}</Text>
        </View>
        <View
          accessible={false}
          accessibilityLabel="calc-expression"
        >
          <Text style={styles(theme).input}>{data.expression}</Text>
        </View>
      </View>
    </Container>
  );
}
