import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Link from './Link';
import Icon from './partials/Icon';
import { elementSideMargins, cardMargins, getVPHeight, cardBorderTopRadius, cardBorderBottomRadius } from '../styles/CardStyle';
import { getMessage } from '../../core/i18n';

const styles = (backgroundColor, width) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0)' // allow snapping along viewport (outside of card)
    },
    card: {
      width,
      height: getVPHeight() / 3,
      minHeight: 90,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `#${backgroundColor}`,
      ...cardBorderTopRadius,
      ...cardBorderBottomRadius,
      ...cardMargins,
    },
    text: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 15,
      ...elementSideMargins,
      textAlign: 'center',
    }
  });

export default class SearchEngineCard extends React.Component {
  sendResultClickTelemetry(/* event */) {
    // @khaled: please send telemetry to background
    /*
    const result = this.props.result;
    const resultKind = result.data.kind || [];
    const tapPosition = [
      event.nativeEvent.pageX,
      event.nativeEvent.pageY
    ];

    const signal = {
      position_type: resultKind,
      current_position: this.props.index,
      tap_position: tapPosition,
    };
    */

    // telemetry.push(signal, 'mobile_result_selection');
  }

  getSelection = () => {
    const props = this.props;
    const meta = props.meta;
    const result = props.result;
    const selection = {
      action: 'click',
      elementName: 'title',
      isFromAutoCompletedUrl: false,
      isNewTab: false,
      isPrivateMode: false,
      isPrivateResult: meta.isPrivate,
      query: meta.query,
      rawResult: {
        index: props.index,
        ...props.result,
      },
      resultOrder: meta.resultOrder,
      url: result.url,
    };
    return selection;
  }

  render() {
    const result = this.props.result;
    const url = result.url;
    const logoDetails = result.meta.logo || {};
    const width = this.props.width;
    const noResults = this.props.noResults;
    const title = noResults ? getMessage('mobile_no_result_title') : getMessage('mobile_more_results_title');
    return (
      <View
        accessible={false}
        accessibilityLabel="complementary-search-card"
        style={styles(width).container}
      >
        <Link
          label="complementary-search-link"
          url={url}
          getSelection={this.getSelection}
        >
          <View
            accessible={false}
            accessibilityLabel="complementary-search-card-content"
            style={styles(logoDetails.backgroundColor, width).card}
          >
            <Text style={styles(logoDetails.backgroundColor, width).text}>{title}</Text>
            <Icon logoDetails={logoDetails} width={50} height={50} />
          </View>
        </Link>
      </View>
    );
  }
}
