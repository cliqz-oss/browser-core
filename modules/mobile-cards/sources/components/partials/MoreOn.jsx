import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { elementSideMargins } from '../../styles/CardStyle';
import Link from '../Link';
import { getMessage } from '../../../core/i18n';

class Url extends React.Component {

  render() {
    return (
      <Link to={this.props.url}>
        <Text style={styles.text}>{getMessage('more_on')} {this.props.provider}</Text>
      </Link>
    );
  }
}

const styles = StyleSheet.create({
  text: {
    color: '#999',
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 11,
    ...elementSideMargins,
  }
});

export default Url;
