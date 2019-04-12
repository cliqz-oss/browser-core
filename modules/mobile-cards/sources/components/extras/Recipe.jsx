import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getMessage } from '../../../core/i18n';
import ExpandView from '../ExpandView';
import Rating from '../partials/Rating';
import { elementTopMargin, elementSideMargins } from '../../styles/CardStyle';
import themeDetails from '../../themes';

// trigger with query: beef jerky chefkoch
// make sure results are set to germany

const styles = theme => StyleSheet.create({
  item: {
    color: themeDetails[theme].textColor,
    marginBottom: 12,
  },
  headerText: {
    paddingTop: 3,
    paddingBottom: 3,
    color: themeDetails[theme].textColor,
  },
  cookTime: {
    color: themeDetails[theme].textColor
  }
});

export default class Recipe extends React.Component {
  displayInstruction(text, theme) {
    return (
      <View
        accessible={false}
        accessibilityLabel="recipe-instructions"
      >
        <Text key={text} style={styles(theme).item}>{ text }</Text>
      </View>
    );
  }

  displayItem(key, content) {
    const theme = this.props.theme;

    return {
      header: <Text style={styles(theme).headerText}>{ getMessage(key) }</Text>,
      content: <View>{ content.map(text => this.displayInstruction(text, theme)) }</View>
    };
  }

  render() {
    const data = this.props.data;
    const richData = data.rich_data || {};
    const theme = this.props.theme;
    const details = Object.keys(richData.mobi || {})
      .filter(key => richData.mobi[key] && richData.mobi[key].length)
      .map(key => this.displayItem(key, richData.mobi[key]))
      .map((item, index) => (
        <ExpandView
          key={item.header}
          index={index}
          header={item.header}
          content={item.content}
          theme={theme}
        />
      ));

    return (
      <View
        accessible={false}
        accessibilityLabel="recipe"
        style={{ marginTop: 5 }}
      >
        <View style={elementSideMargins}>
          <Rating image={richData.url_ratingimg} />
          <View
            accessible={false}
            accessibilityLabel="recipe-cooking-time"
          >
            <Text style={styles(theme).cookTime}>{getMessage('cook_time', richData.cook_time)}</Text>
          </View>
        </View>
        <View style={elementTopMargin}>
          { details }
        </View>
      </View>
    );
  }
}
