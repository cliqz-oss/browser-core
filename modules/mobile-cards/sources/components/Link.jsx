import React from 'react';
import { TouchableOpacity } from 'react-native';
import events from '../../core/events';

export default class extends React.Component {

  _onPress(e) {
    const url = this.props.to;
    const action = this.props.actionName;
    const params = this.props.actionParams || [];
    if (url) {
      const extra = this.props.extra || 'other';
      // TODO: telemetry
      console.log('open link', url, extra);
      // openLink(url);
      events.pub('mobile-search:openUrl', url);
    } else if (action) {
      events.pub(action, ...params);
    }
    // callback onPress
    this.props.onPress && this.props.onPress(e);
  }
  render() {
    return <TouchableOpacity activeOpacity={1} {...this.props} onPress={this._onPress.bind(this)} />
  }
}
