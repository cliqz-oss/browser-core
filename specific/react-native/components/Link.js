import React from 'react';
import { TouchableHighlight } from 'react-native';
import { executeNativeAction } from '../modules/platform/browser-actions';

export default class extends React.Component {

  _onPress() {
    const url = this.to;
    const action = this.actionName;
    if (url) {
      const extra = this.extra || 'other';
      // TODO: telemetry
      console.log('open link', url, extra);
      this.openLink(url);
    } else if (action) {
      executeNativeAction(action, this.actionParams);
    }
  }
  render() {
    return <TouchableHighlight {...this.props} onPress={this._onPress} />
  }
}