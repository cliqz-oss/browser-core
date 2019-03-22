import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Link from '../Link';
import Icon from './Icon';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import {
  elementSideMargins,
  elementTopMargin,
  getCardWidth,
} from '../../styles/CardStyle';
import { getMessage } from '../../../core/i18n';
import themeDetails from '../../themes';

const commonStyles = theme => ({
  historyIcon: {
    width: 15,
    height: 15,
    marginLeft: 10,
  },
  title: {
    color: themeDetails[theme].textColor,
    fontWeight: 'bold',
    fontSize: 15,
    ...elementSideMargins,
    paddingTop: 6,
    paddingBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    ...elementSideMargins,
  },
  textContainer: {
    maxHeight: 15,
    overflow: 'hidden',
  },
});

const cluster = (theme, color) => ({
  historyHeader: {
    backgroundColor: themeDetails[theme].highlightedBackgroundColor,
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    borderTopWidth: 1.5,
    borderTopColor: themeDetails[theme].separatorColor,
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 12,
  },
  text: {
    color: themeDetails[theme].textColor,
    lineHeight: 15,
    width: getCardWidth() - 95, // width of icon + margins
  },
  url: {
    color,
    lineHeight: 15,
    width: getCardWidth() - 95, // width of icon + margins
    fontSize: 11,
    fontWeight: 'bold',
  }
});

const nonCluster = (theme, color) => ({
  historyHeader: {
    borderTopWidth: 1.5,
    borderTopColor: themeDetails[theme].separatorColor,
    flexDirection: 'row',
    alignItems: 'center',
    ...elementTopMargin,
  },
  row: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingTop: 5,
    paddingBottom: 5,
  },
  text: {
    color: themeDetails[theme].textColor,
    lineHeight: 15,
    width: getCardWidth() - 50, // width of icon + margins
  },
  url: {
    color,
    lineHeight: 15,
    width: getCardWidth() - 50, // width of icon + margins
    fontSize: 11,
    fontWeight: 'bold',
  },
});

const clusterStyle = (theme, color) => StyleSheet.create({
  ...commonStyles(theme, color),
  ...cluster(theme, color),
});

const nonClusterStyle = (theme, color) => StyleSheet.create({
  ...commonStyles(theme, color),
  ...nonCluster(theme, color),
});

export default class HistoryUrls extends React.Component {
  displayUrls(data, styles, theme) {
    const color = (theme === 'light') ? '#551A8B' : themeDetails[theme].textColor;

    return (
      <Link label="history-result" url={data.url} key={data.url}>
        <View style={styles(theme, color).row}>
          <View style={styles(theme, color).header}>
            <Icon width={34} height={34} logoDetails={data.logo} />
            <View style={{ flexDirection: 'column' }}>
              <View
                accessible={false}
                accessibilityLabel="history-link"
                style={styles(theme, color).textContainer}
              >
                <Text numberOfLines={1} style={styles(theme, color).url}>{data.url}</Text>
              </View>
              <View
                accessible={false}
                accessibilityLabel="history-title"
                style={styles(theme, color).textContainer}
              >
                <Text numberOfLines={1} style={styles(theme, color).text}>{data.title}</Text>
              </View>
            </View>
          </View>
        </View>
      </Link>
    );
  }

  render() {
    const props = this.props;
    const theme = props.theme;
    const color = (theme === 'light') ? '#551A8B' : themeDetails[theme].textColor;
    const historyIconColor = (theme === 'light') ? '#000000' : '#FFFFFF';
    const historyIcon = Platform.select({
      default: `PanelIconCliqzHistory_${theme}.svg`,
      android: 'ic_history_white.svg'
    });

    if (!props.urls || !props.urls.length) {
      return null;
    }
    // some urls are not http urls
    const urls = props.urls.filter(data => data.href.startsWith('http'));
    const styles = props.template === 'cluster' ? clusterStyle : nonClusterStyle;
    return (
      <View
        accessible={false}
        accessibilityLabel="history-container"
      >
        <View
          accessible={false}
          accessibilityLabel="history-header"
          style={styles(theme, color).historyHeader}
        >
          <NativeDrawable
            style={styles(theme, color).historyIcon}
            source={normalizeUrl(historyIcon, { isNative: true })}
            color={historyIconColor}
          />
          <Text style={styles(theme, color).title}>{getMessage('mobile_history_card_title')}</Text>
        </View>
        {urls.map(data => this.displayUrls(data, styles, theme))}
      </View>
    );
  }
}
