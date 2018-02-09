import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import utils from '../../core/utils';
import events from '../../core/events';
import { getMessage } from '../../core/i18n';
import  sendTelemetry from '../../platform/cards-telemetry';
import { cardMargins, cardBorderRadius } from '../styles/CardStyle';
import Generic from './Generic';
import Link from './Link';
import ShareCard from './partials/ShareCard';

class Card extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      scrollOffset: 0,
    };
  }

  sendResultClickTelemetry(event) {
    const result = this.props.result;
    const resultKind = (result.data.kind || []);
    const signal = {
      type: 'activity',
      action: 'result_click',
      mouse: [event.nativeEvent.pageX, event.nativeEvent.pageY + this.state.scrollOffset],
      position_type: resultKind,
      current_position: this.props.index,
    };
    sendTelemetry(signal);
  }

  shouldComponentUpdate(nextProps) {
    const resultChanged = nextProps.result !== this.props.result;
    const layoutChanged = nextProps.width !== this.props.width
    return resultChanged || layoutChanged;
  }

  render() {
    const result = this.props.result;
    if (!result || !result.data) {
      return null;
    }
    const width = this.props.width;
    const cardTitle = result.data.title || '';
    const titleExtra = getMessage('mobile_card_look_shared_via');
    const shareTitle = cardTitle ? titleExtra + ':\n\n' + cardTitle : titleExtra + '.';
    return (
      <View
        accessible={false}
        accessibilityLabel={`result-card-${this.props.index}`}
        style={styles(width).container}
        onTouchStart={() => events.pub('mobile-search:hideKeyboard')}
      >
        <ScrollView onScroll={(e) => this.setState({ scrollOffset: e.nativeEvent.contentOffset.y })}>
          <ShareCard style={styles(width).card} title={shareTitle}>
            <Link
              to={result.val}
              onPress={this.sendResultClickTelemetry.bind(this)}
              openLink={this.props.openLink}
            >
              <Generic result={result} />
            </Link>
          </ShareCard>
        </ScrollView>
      </View>
    )
  }
}

var styles = (width) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0)' // allow snapping along viewport (outside of card)
  },
  card: {
    backgroundColor: '#FFFFFF',
    width,
    ...cardBorderRadius,
    ...cardMargins,
  },
});

export default Card;
