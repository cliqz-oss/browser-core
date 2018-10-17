import React from 'react';
import { StyleSheet, ScrollView, View, Platform } from 'react-native';
import { getMessage } from '../../core/i18n';
import { appName } from '../../platform/platform';
import { cardMargins, cardBorderTopRadius, cardBorderBottomRadius } from '../styles/CardStyle';
import Generic from './Generic';
import Link from './Link';
import ShareCard from './partials/ShareCard';
import { withCliqz } from '../cliqz';

const styles = width => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0)' // allow snapping along viewport (outside of card)
  },
  card: {
    elevation: 2, // android
    backgroundColor: '#FFFFFF',
    width,
    ...cardBorderTopRadius,
    ...cardBorderBottomRadius,
    ...cardMargins,
  },
});

class Card extends React.Component {
  shouldComponentUpdate(nextProps) {
    const resultChanged = nextProps.result !== this.props.result;
    const layoutChanged = nextProps.width !== this.props.width;
    return resultChanged || layoutChanged;
  }

  sendResultClickTelemetry() {
    // TODO: call reportSelection search background action
  }

  render() {
    const result = this.props.result;
    if (!result || !result.data) {
      return null;
    }
    const width = this.props.width;
    const cardTitle = result.data.title || '';
    const titleExtra = getMessage('mobile_card_look_shared_via', appName);
    const shareTitle = cardTitle ? `${titleExtra}:\n\n${cardTitle}` : `${titleExtra}.`;
    const shadowProps = {};
    if (Platform.OS === 'ios') {
      shadowProps.shadowColor = 'black';
      shadowProps.shadowOpacity = 0.12;
      shadowProps.shadowRadius = 4;
      shadowProps.shadowOffset = { width: 2, height: 2 };
    }
    return (
      <View
        {...shadowProps}
        accessible={false}
        accessibilityLabel={`result-card-${this.props.index}`}
        style={styles(width).container}
        onTouchStart={() => this.props.cliqz.mobileCards.hideKeyboard()}
        key={result.url}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
        >
          <ShareCard style={styles(width).card} title={shareTitle}>
            <Link
              label="main-url"
              url={result.url}
              onPress={(...args) => this.sendResultClickTelemetry(...args)}
            >
              <Generic result={result} />
            </Link>
          </ShareCard>
        </ScrollView>
      </View>
    );
  }
}

export default withCliqz(Card);
