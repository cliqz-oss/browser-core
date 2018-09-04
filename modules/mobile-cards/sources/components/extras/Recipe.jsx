import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getMessage } from '../../../core/i18n';
import ExpandView from '../ExpandView';
import Rating from '../partials/Rating';
import { elementTopMargin, elementSideMargins } from '../../styles/CardStyle';

// trigger with query: beef jerky chefkoch
// make sure results are set to germany

const styles = StyleSheet.create({
  item: {
    color: 'black',
    marginBottom: 12,
  },
  headerText: {
    paddingTop: 3,
    paddingBottom: 3,
    color: 'black',
  }
});

export default class Recipe extends React.Component {
  displayInstruction(text) {
    return (
      <Text key={text} style={styles.item}>{ text }</Text>
    );
  }

  displayItem(key, content) {
    return {
      header: <Text style={styles.headerText}>{ getMessage(key) }</Text>,
      content: <View>{ content.map(this.displayInstruction) }</View>
    };
  }

  render() {
    const data = this.props.data;
    const richData = data.rich_data || {};

    const details = Object.keys(richData.mobi || {})
      .filter(key => richData.mobi[key] && richData.mobi[key].length)
      .map(key => this.displayItem(key, richData.mobi[key]))
      .map((item, index) =>
        <ExpandView key={item.header} index={index} header={item.header} content={item.content} />);

    return (
      <View style={{ marginTop: 5 }}>
        <View style={elementSideMargins}>
          <Rating image={richData.url_ratingimg} />
          <Text style={{ color: 'black' }}>{getMessage('CookTime', richData.cook_time)}</Text>
        </View>
        <View style={elementTopMargin}>
          { details }
        </View>
      </View>
    );
  }
}
