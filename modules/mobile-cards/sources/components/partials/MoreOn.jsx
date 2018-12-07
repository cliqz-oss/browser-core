import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { elementSideMargins } from '../../styles/CardStyle';
import Link from '../Link';
import { getMessage } from '../../../core/i18n';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create({
  text: {
    color: themeDetails[theme].subHeader,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 11,
    ...elementSideMargins,
  }
});

export default function (props) {
  const theme = props.theme;
  return (
    <Link label="generic-more-on" url={props.url}>
      <Text style={styles(theme).text}>
        {`${getMessage('more_on')} ${props.provider}`}
      </Text>
    </Link>
  );
}
