import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Link from '../Link';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';

export default class extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    if (!this.props.data || !this.props.data.length) {
      return null;
    }
    return <View>
      {this.props.data.slice(0, 3).map(this.displayLink)}
    </View>
  }

  displayLink(link) {
    return (
      <Link to={link.url} style={styles.row} key={link.url}>
        <Text style={styles.text}>{link.title_locale || link.title}</Text>
      </Link>
    );
  }
}


const styles = StyleSheet.create({
  row: {
    ...elementTopMargin,
    borderTopWidth: 1,
    borderTopColor: '#EDECEC',
    paddingTop: 10,
  },
  text: {
    ...elementSideMargins,
    color: '#000000',
  }
});
