import React from 'react';
import { TouchableWithoutFeedback, View, Platform } from 'react-native';
import events from '../../core/events';
import console from '../../core/console';
import { withCliqz } from '../cliqz';

class Link extends React.Component {

  _onPress = (e) => {
    e.stopPropagation();
    const mobileCards = this.props.cliqz.mobileCards;
    const url = this.props.url;
    const action = url ? 'openLink' : this.props.action;
    const param = url ? url : this.props.param;
    if (action) {
      console.debug(`Browser action ${action} is called`);
      mobileCards[action](param);
    }
    // callback onPress
    this.props.onPress && this.props.onPress(e);
  }

  render() {
    return Platform.select({
      ios: (
        <TouchableWithoutFeedback onPress={this._onPress}>
          <View {...this.props} />
        </TouchableWithoutFeedback>
      ),
      web: (
        <div onClick={this._onPress}>
          { this.props.children }
        </div>
      )
    });
  }
}

export default withCliqz(Link);
