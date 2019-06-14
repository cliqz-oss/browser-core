import React from 'react';
import { TouchableWithoutFeedback, View, Platform } from 'react-native';
import console from '../../core/console';
import { withCliqz } from '../cliqz';
import { withResult, getSelection } from '../ResultProvider';

class Link extends React.Component {
  _onPress = (e) => {
    e.stopPropagation();
    const { result, meta, index, cliqz } = this.props;
    const mobileCards = cliqz.mobileCards;
    const url = this.props.url;
    const action = url ? 'openLink' : this.props.action;
    const param = url || this.props.param;
    if (action) {
      console.debug(`Browser action ${action} is called`);
      mobileCards[action](param, getSelection(result, meta, index));
    }
    // callback onPress
    if (this.props.onPress) {
      this.props.onPress(e);
    }
  }

  render() {
    return Platform.select({
      default: (
        <TouchableWithoutFeedback onPress={this._onPress}>
          <View {...this.props} />
        </TouchableWithoutFeedback>
      ),
      web: (
        <View style={this.props.style}>
          <div
            aria-label={this.props.label}
            data-url={this.props.url}
            onClick={this._onPress}
            role="presentation"
          >
            {this.props.children}
          </div>
        </View>
      )
    });
  }
}

export default withCliqz(withResult(Link));
