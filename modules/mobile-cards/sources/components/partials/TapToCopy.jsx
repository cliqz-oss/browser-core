import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Link from '../Link';
import { getMessage } from '../../../core/i18n';
import { copyToClipboard } from '../../../core/clipboard';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create({
  copy: {
    color: themeDetails[theme].tapToCopyColor,
    alignSelf: 'center',
  }
});

export default class TapToCopy extends React.Component {
  constructor(props) {
    super(props);
    this.state = { copied: false };
  }

  componentWillReceiveProps() {
    this.setState({ copied: false });
  }

  render() {
    const theme = this.props.theme;
    return (
      <Link
        onPress={() => {
          copyToClipboard(String(this.props.val));
          this.setState({ copied: true });
        }}
      >
        <View>
          { this.props.children }
          <Text
            accessible={false}
            accessibilityLabel="generic-copy-msg"
            style={styles(theme).copy}
          >
            {getMessage(this.state.copied ? 'copied' : 'mobile_calc_copy_ans')}
          </Text>
        </View>
      </Link>
    );
  }
}
