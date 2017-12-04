import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import utils from '../../core/utils';
import events from '../../core/events';
import { getMessage } from '../../core/i18n';
import { cardMargins, cardBorderRadius } from '../styles/CardStyle';
import Generic from './Generic';
import Link from './Link';
import ShareCard from './partials/ShareCard';

class Card extends React.Component {

  render() {
    const result = this.props.result;
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
        <ScrollView>
          <ShareCard style={styles(width).card} title={shareTitle}>
            <Link to={result.val} openLink={this.props.openLink}>
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
