import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import events from '../../core/events';
import { getMessage } from '../../core/i18n';
import { cardMargins, cardBorderTopRadius, cardBorderBottomRadius } from '../styles/CardStyle';
import Generic from './Generic';
import Link from './Link';
import ShareCard from './partials/ShareCard';
import inject from '../../core/kord/inject';

const anolysis = inject.module('anolysis');

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

export default class extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      scrollOffset: 0,
    };
  }

  shouldComponentUpdate(nextProps) {
    const resultChanged = nextProps.result !== this.props.result;
    const layoutChanged = nextProps.width !== this.props.width;
    return resultChanged || layoutChanged;
  }

  sendResultClickTelemetry(event) {
    const result = this.props.result;
    const resultKind = result.data.kind || [];
    const tapPosition = [
      event.nativeEvent.pageX,
      event.nativeEvent.pageY + this.state.scrollOffset
    ];
    const signal = {
      position_type: resultKind,
      current_position: this.props.index,
      tap_position: tapPosition,
    };
    anolysis.action('handleTelemetrySignal', signal, 'mobile_result_selection');
  }

  render() {
    const result = this.props.result;
    if (!result || !result.data) {
      return null;
    }
    const width = this.props.width;
    const cardTitle = result.data.title || '';
    const titleExtra = getMessage('mobile_card_look_shared_via');
    const shareTitle = cardTitle ? `${titleExtra}:\n\n${cardTitle}` : `${titleExtra}.`;
    return (
      <View
        shadowColor="black"
        shadowOpacity={0.12}
        shadowRadius={4}
        shadowOffset={{ width: 2, height: 2 }}
        accessible={false}
        accessibilityLabel={`result-card-${this.props.index}`}
        style={styles(width).container}
        onTouchStart={() => events.pub('mobile-search:hideKeyboard')}
      >
        <ScrollView
          onScroll={e => this.setState({ scrollOffset: e.nativeEvent.contentOffset.y })}
          showsVerticalScrollIndicator={false}
        >
          <ShareCard style={styles(width).card} title={shareTitle}>
            <Link
              to={result.url}
              onPress={(...args) => this.sendResultClickTelemetry(...args)}
              openLink={this.props.openLink}
            >
              <Generic result={result} />
            </Link>
          </ShareCard>
        </ScrollView>
      </View>
    );
  }
}
