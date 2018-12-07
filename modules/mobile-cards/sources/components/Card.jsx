import React from 'react';
import { StyleSheet, ScrollView, View, Platform } from 'react-native';
import { getMessage } from '../../core/i18n';
import { appName } from '../../platform/platform';
import { cardMargins, cardBorderTopRadius, cardBorderBottomRadius } from '../styles/CardStyle';
import Generic from './Generic';
import Link from './Link';
import ShareCard from './partials/ShareCard';
import { withCliqz } from '../cliqz';
import themeDetails from '../themes';

const styles = (width, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeDetails[theme].container.bgColor, // allow snapping along viewport
  },
  card: {
    elevation: 2, // android
    backgroundColor: themeDetails[theme].card.backgroundColor,
    width,
    ...cardBorderTopRadius,
    ...cardBorderBottomRadius,
    ...cardMargins,
    overflow: 'hidden',
  },
});

class Card extends React.Component {
  shouldComponentUpdate(nextProps) {
    const resultChanged = nextProps.result !== this.props.result;
    const layoutChanged = nextProps.width !== this.props.width;
    const themeChanged = nextProps.theme !== this.props.theme;
    return resultChanged || layoutChanged || themeChanged;
  }

  sendResultClickTelemetry() {
    // TODO: call reportSelection search background action
  }

  render() {
    const result = this.props.result;
    const theme = this.props.theme;
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
        style={styles(width, theme).container}
        onTouchStart={() => this.props.cliqz.mobileCards.hideKeyboard()}
        key={result.url}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
        >
          <ShareCard style={styles(width, theme).card} title={shareTitle}>
            <Link
              label="main-url"
              url={result.url}
              onPress={(...args) => this.sendResultClickTelemetry(...args)}
            >
              <Generic result={result} theme={theme} />
            </Link>
          </ShareCard>
        </ScrollView>
      </View>
    );
  }
}

export default withCliqz(Card);
