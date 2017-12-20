import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

import Link from './Link';
import { getMessage } from '../../core/i18n';
import { NativeModules } from 'react-native';

export default class SubscribeButton extends React.Component {

  render() {
    const color = this.props.isSubscribed ? 'grey' : 'red';
    const title = getMessage(this.props.isSubscribed ? 'mobile_soccer_unsubscribe' : 'mobile_soccer_subscribe');
    const button = this.props.noButton ||
                  <Link onPress={this.props.onPress}>
                    <View style={ styles(color).button }>
                      <Text style={ styles().buttonText }>{ title }</Text>
                    </View>
                  </Link>
    return <View>
        { button }
        <Text style={ styles().actionMessage }>{this.props.actionMessage}</Text>
      </View>
  }
}

const styles = (backgroundColor) => StyleSheet.create({
  buttonText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  button: {
    marginTop: 7,
    backgroundColor,
    borderRadius: 5,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMessage: {
    color: '#CECECE',
    fontSize: 12,
    fontWeight: '100',
    marginTop: 4,
  }
});

SubscribeButton.propTypes = {
  isSubscribed: PropTypes.bool.isRequired,
  noButton: PropTypes.bool,
  actionMessage: PropTypes.string,
}
