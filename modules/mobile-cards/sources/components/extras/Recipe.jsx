import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getMessage } from '../../../core/i18n';
import ExpandView from '../ExpandView';
import Rating from '../partials/Rating';
import { elementSideMargins } from '../../styles/CardStyle';

// trigger with query: beef jerk
// make sure results are set to germany

export default class extends React.Component {

  render() {
    const data = this.props.data;
    const richData = data.rich_data || {};

    const details = Object.keys(richData.mobi || {})
      .filter(key => richData.mobi[key] && richData.mobi[key].length)
      .map(key => <ExpandView key={key} header={getMessage(key)} content={richData.mobi[key]} />);

    return <View style={{ marginTop: 5 }}>
      <View style={{ ...elementSideMargins }}>
        <Rating image={richData.url_ratingimg}/>
        <Text style={{color: 'black'}}>{getMessage('CookTime', richData.cook_time)}</Text>
      </View>
      { details }
    </View>
  }
}
