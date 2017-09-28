import React from 'react';
import { TouchableHighlight } from 'react-native';
import events from '../modules/core/events';

export default class extends React.Component {

  _onPress() {
    const url = this.to;
    const action = this.actionName;
    if (url) {
      const extra = this.extra || 'other';
      // TODO: telemetry
      console.log('open link', url, extra);
      // openLink(url);
      events.pub('mobile-search:openUrl', url);
    } else if (action) {
      events.pub('mobile-search:copyValue', ...this.actionParams);
    }
  }
  render() {
    return <TouchableHighlight {...this.props} onPress={this._onPress} />
  }
}