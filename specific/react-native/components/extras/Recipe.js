import React from 'react';
import { StyleSheet, View } from 'react-native';

import { getMessage } from '../../modules/core/i18n';
import ExpandView from '../ExpandView';


export default class extends React.Component {

  render() {
    const data = this.props.data;
    const richData = data.rich_data || {};

    const details = Object.keys(richData.mobi || {})
      .filter(key => richData.mobi[key] && richData.mobi[key].length)
      .map(key => <ExpandView key={key} header={getMessage(key)} content={richData.mobi[key]} />);

    return <View>
      { details }
    </View>
  }
}