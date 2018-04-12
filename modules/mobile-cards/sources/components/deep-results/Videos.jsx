import React from 'react';
import { StyleSheet, Image, View, Text } from 'react-native';
import Link from '../Link';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';

const styles = StyleSheet.create({
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
  text: {
    color: 'black',
    marginRight: 65, // the width of the image
    fontSize: 13,
    lineHeight: 20,
  },
  twitter: {
    width: 20,
    height: 20,
  }
});

export default class extends React.Component {
  displayLink(link) {
    const thumbnail = (link.extra && link.extra.thumbnail)
          || 'https://cdn.cliqz.com/extension/EZ/news/no-image-mobile.png';
    const nLines = 3;
    return (
      <Link to={link.url} key={link.url}>
        <View style={styles.item}>
          <Image
            source={{ uri: thumbnail }}
            style={styles.image}
            resizeMode={'cover'}
          />
          <View style={{ flexDirection: 'column', justifyContent: 'flex-start', marginLeft: 6 }}>
            <Text style={styles.text} numberOfLines={nLines}>{link.title}</Text>
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
      <View style={styles.social} >
        {this.props.data.slice(0, 3).map(this.displayLink)}
      </View>
    );
  }
}
