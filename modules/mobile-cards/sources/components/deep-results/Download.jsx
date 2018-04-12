import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getMessage } from '../../../core/i18n';
import Link from '../Link';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';

const styles = StyleSheet.create({
  row: {
    ...elementTopMargin,
    borderTopWidth: 1,
    borderTopColor: '#EDECEC',
    paddingTop: 10,
  },
  text: {
    fontSize: 16,
    ...elementSideMargins,
    color: '#000000',
  }
});

export default class extends React.Component {
  displayLink(link) {
    return (
      <Link to={link.url} style={styles.row} key={link.url}>
        <Text style={styles.text}>{ getMessage(link.extra.domain) }</Text>
      </Link>
    );
  }

  render() {
    if (!this.props.data || !this.props.data.length) {
      return null;
    }
    return (
      <View>
        {this.props.data.slice(0, 3).map(this.displayLink)}
      </View>
    );
  }
}
