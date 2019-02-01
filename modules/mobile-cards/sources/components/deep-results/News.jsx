import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import Link from '../Link';
import { elementSideMargins, elementTopMargin, getCardWidth } from '../../styles/CardStyle';
import CONFIG from '../../../core/config';
import { agoLine } from '../../helpers/logic';
import themeDetails from '../../themes';

const styles = ({ isInjected, nLines, theme } = {}) => StyleSheet.create({
  social: {
    ...elementSideMargins,
    ...elementTopMargin,
    borderRadius: 5,
  },
  item: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: isInjected ? 0 : 5,
    backgroundColor: isInjected ? themeDetails[theme].highlightedBackgroundColor : 'transparent',
    marginBottom: 5,
    borderRadius: 5,
    overflow: 'hidden',
  },
  image: {
    height: 60,
    width: 65,
    borderRadius: isInjected ? 0 : 5,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginLeft: 6,
    maxHeight: nLines * 16, // line hight
    overflow: 'hidden',
  },
  text: {
    color: themeDetails[theme].textColor,
    width: getCardWidth() - 105, // image width + margins
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '400',
  },
  creation: {
    color: themeDetails[theme].textColor,
    fontSize: 11,
    lineHeight: 16,
  }
});

export default class News extends React.Component {
  displayLink(link, isInjected) {
    const theme = this.props.theme;
    const thumbnail = (link.extra && link.extra.thumbnail)
          || `${CONFIG.settings.CDN_BASEURL}/extension/EZ/news/no-image-mobile.png`;
    const nLines = 2;
    const creationTime = agoLine(link.extra.creation_timestamp);
    return (
      <Link label="news-item" url={link.url} key={link.url}>
        <View style={styles({ isInjected, theme }).item}>
          <View
            accessible={false}
            accessibilityLabel="news-image"
          >
            <Image
              source={{ uri: thumbnail }}
              style={styles({ theme }).image}
              resizeMode="cover"
            />
          </View>
          <View style={{ paddingTop: 5, paddingBottom: 5 }}>
            <View
              accessible={false}
              accessibilityLabel="news-title"
              style={styles({ isInjected, nLines, theme }).textContainer}
            >
              <Text style={styles({ theme }).text} numberOfLines={nLines}>
                {link.title}
              </Text>
            </View>
            <View style={styles({ isInjected, nLines: 1, theme }).textContainer}>
              {isInjected === true
                && (
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ color: '#2CBA84', fontSize: 11, lineHeight: 16 }}>{link.extra.domain}</Text>
                    <Text style={{ color: 'white', fontSize: 11, lineHeight: 16 }}> -</Text>
                  </View>
                )
              }
              <View
                accessible={false}
                accessibilityLabel="news-timestamp"
              >
                <Text style={styles({ isInjected, theme }).creation}>{creationTime}</Text>
              </View>
            </View>
          </View>
        </View>
      </Link>
    );
  }

  render() {
    const theme = this.props.theme;
    if (!this.props.data || !this.props.data.length) {
      return null;
    }

    let isInjected = false;

    if (this.props.template !== 'entity-news-1') {
      isInjected = true;
    }

    const numberOfNews = isInjected === false ? 3 : 1;

    return (
      <View style={styles({ isInjected, theme }).social}>
        {
          this.props.data.slice(0, numberOfNews)
            .map(link => this.displayLink(link, isInjected))
        }
      </View>
    );
  }
}
