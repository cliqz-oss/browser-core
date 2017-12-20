import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Link from '../Link';
import { getMessage } from '../../../core/i18n';

export default class extends React.Component {

  constructor(props) {
    super(props);
    this.state = { copied: false }
  }

  componentWillReceiveProps() {
    this.setState({ copied: false });
  }

  render() {
    return (
      <Link
        onPress={() => this.setState({copied: true})}
        actionName='mobile-search:copyValue'
        actionParams={[ String(this.props.val) ]}
      >
        <View>
          { this.props.children }
          <Text style={styles.copy}>
            {getMessage(this.state.copied ? 'Copied' : 'mobile_calc_copy_ans')}
          </Text>
        </View>
      </Link>
    );
  }
}

const styles = StyleSheet.create({
  copy: {
    color: '#CECECE',
    alignSelf: 'center',
  }
});
