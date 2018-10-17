import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Link from '../Link';
import Icon from './Icon';
import Url from './Url';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';
import { getMessage } from '../../../core/i18n';

const styles = StyleSheet.create({
  container: {
    ...elementTopMargin,
  },
  title: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 15,
    ...elementSideMargins,
    paddingTop: 6,
    paddingBottom: 6,
  },
  text: {
    color: 'black',
    ...elementSideMargins,
    marginTop: 10,
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: '#EDECEC',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    ...elementSideMargins,
  },
});

export default class HistoryUrls extends React.Component {
  displayUrls(data) {
    return (
      <Link label="history-result" url={data.url} key={data.url}>
        <View style={styles.row} >
          <View style={styles.header}>
            <Icon width={34} height={34} url={data.url} />
            <Url url={data.url} isHistory />
          </View>
          <View
            accessible={false}
            accessibilityLabel={'history-title'}
          >
            <Text style={styles.text}>{data.title}</Text>
          </View>
        </View>
      </Link>
    );
  }

  render() {
    if (!this.props.urls || !this.props.urls.length) {
      return null;
    }
    // some urls are not http urls
    const urls = this.props.urls.filter(data => data.href.startsWith('http'));
    return (
      <View
        accessible={false}
        accessibilityLabel={'history-container'}
        style={styles.container}
      >
        <View
          accessible={false}
          accessibilityLabel={'history-header'}
        >
          <Text style={styles.title}>{getMessage('mobile_history_card_title')}</Text>
        </View>
        {urls.map(this.displayUrls)}
      </View>
    );
  }
}
