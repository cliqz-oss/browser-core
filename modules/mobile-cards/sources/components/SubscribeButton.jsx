import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

import Link from './Link';
import { getMessage } from '../../core/i18n';

const styles = backgroundColor => StyleSheet.create({
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

function SubscribeButton(props) {
  const color = props.isSubscribed ? 'grey' : 'red';
  const title = getMessage(props.isSubscribed ? 'mobile_soccer_unsubscribe' : 'mobile_soccer_subscribe');
  const button = props.noButton
    || (
      <Link onPress={props.onPress}>
        <View style={styles(color).button}>
          <Text style={styles().buttonText}>{title}</Text>
        </View>
      </Link>
    );
  return (
    <View
      accessible={false}
      accessibilityLabel="subscribe-button"
    >
      {button}
      <Text style={styles().actionMessage}>{props.actionMessage}</Text>
    </View>
  );
}

SubscribeButton.propTypes = {
  isSubscribed: PropTypes.bool.isRequired,
  noButton: PropTypes.bool,
  actionMessage: PropTypes.string,
};

export default SubscribeButton;
