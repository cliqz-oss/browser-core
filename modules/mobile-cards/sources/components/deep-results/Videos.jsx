import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import Link from '../Link';
import { elementSideMargins, elementTopMargin, getCardWidth } from '../../styles/CardStyle';
import CONFIG from '../../../core/config';

const styles = nLines => StyleSheet.create({
  social: {
    marginLeft: elementSideMargins.marginLeft + 8,
    marginRight: elementSideMargins.marginRight + 8,
    ...elementTopMargin,
  },
  item: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 5,
    marginBottom: 5,
  },
  image: {
    height: 60,
    width: 65,
    borderRadius: 5,
  },
  textContainer: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginLeft: 6,
    maxHeight: nLines * 20, // line hight
    overflow: 'hidden',
  },
  text: {
    color: 'black',
    width: getCardWidth() - 105, // image width + margins
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  twitter: {
    width: 20,
    height: 20,
  }
});

export default class Videos extends React.Component {
  displayLink(link) {
    const thumbnail = (link.extra && link.extra.thumbnail)
          || `${CONFIG.settings.CDN_BASEURL}/extension/EZ/news/no-image-mobile.png`;
    const nLines = 3;
    return (
      <Link url={link.url} key={link.url}>
        <View style={styles().item}>
          <Image
            source={{ uri: thumbnail }}
            style={styles().image}
            resizeMode="cover"
          />
          <View style={styles(nLines).textContainer}>
            <Text style={styles().text} numberOfLines={nLines}>{link.title}</Text>
          </View>
        </View>
      </Link>
    );
  }

  render() {
    if (!this.props.data || !this.props.data.length) {
      return null;
    }
    return (
      <View style={styles().social}>
        {this.props.data.slice(0, 3).map(this.displayLink)}
      </View>
    );
  }
}
