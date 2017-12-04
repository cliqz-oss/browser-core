import React from 'react';
import { View, Button, Text } from 'react-native';
import PropTypes from 'prop-types';

import { getMessage } from '../../core/i18n';
import { NativeModules } from 'react-native';

export default class SubscribeButton extends React.Component {

  render() {
    const color = this.props.isSubscribed ? 'grey' : 'red';
    const title = getMessage(this.props.isSubscribed ? 'mobile_soccer_unsubscribe' : 'mobile_soccer_subscribe');
    const button = this.props.noButton ||
                  <Button title={title} onPress={this.props.onPress} color={color} />
    return <View>
        { button }
        <Text style={{ color: '#CECECE', fontSize: 12, fontWeight: '100', marginTop: 4 }}>{this.props.actionMessage}</Text>
      </View>
  }
}

SubscribeButton.propTypes = {
  isSubscribed: PropTypes.bool.isRequired,
  noButton: PropTypes.bool,
  actionMessage: PropTypes.string,
}
