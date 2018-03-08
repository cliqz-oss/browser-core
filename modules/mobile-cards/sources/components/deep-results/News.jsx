import React from 'react';
import { StyleSheet, Image, View, Text } from 'react-native';
import Link from '../Link';
import { elementSideMargins, elementTopMargin, cardBorderRadius } from '../../styles/CardStyle';
import utils from '../../../core/utils';
import { agoLine } from '../../helpers/logic';


const styles = isInjected => StyleSheet.create({
  social: {
    ...elementSideMargins,
    ...elementTopMargin,
    paddingLeft: 8,
    paddingRight: 8,
    backgroundColor: isInjected ? '#F5F5F5' : 'white',
    borderRadius: 5,
  },
  item: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: isInjected ? 0 : 5,
    marginBottom: 5,
  },
  image: {
    height: 60,
    width: 65, // remember to change the right margin of text
    ...cardBorderRadius,
  },
  text: {
    color: 'black',
    marginRight: 65, // the width of the image
    fontSize: 13,
    lineHeight: 20,
  },
  creation: {
    color: isInjected ? '#2CBA84' : '#999',
  }
});

export default class extends React.Component {
  displayLink(link, isInjected) {
    const thumbnail = (link.extra && link.extra.thumbnail)
          || 'https://cdn.cliqz.com/extension/EZ/news/no-image-mobile.png';
    const nLines = 2;
    const creationTime = agoLine(link.extra.creation_timestamp);
    return (
      <Link to={link.url} key={link.url}>
        <View style={styles().item}>
          <Image
            source={{ uri: thumbnail }}
            style={styles().image}
            resizeMode={'cover'}
          />
          <View style={{ flexDirection: 'column', justifyContent: 'flex-start', marginLeft: 6 }}>
            <Text style={styles().text} numberOfLines={nLines}>{link.title}</Text>
            <Text style={styles(isInjected).creation}>{creationTime}</Text>
          </View>
        </View>
      </Link>
    );
  }

  render() {
    if (!this.props.data || !this.props.data.length) {
      return null;
    }

    let isInjected = false;
    let firstNewsDomain = '';

    if (this.props.data[0] !== undefined) {
      const cardDomain = utils.getDetailsFromUrl(this.props.url).domain;
      firstNewsDomain = utils.getDetailsFromUrl(this.props.data[0].url).domain;
      if (cardDomain !== firstNewsDomain) {
        isInjected = true;
      }
    }

    const numberOfNews = isInjected === false ? 3 : 1;

    return (
      <View style={styles(isInjected).social}>
        {isInjected === true &&
          <Text style={{ color: '#4A90E2', fontSize: 12, marginTop: 4 }}>{firstNewsDomain}</Text>
        }
        {this.props.data.slice(0, numberOfNews).map(link => this.displayLink(link, isInjected))}
      </View>
    );
  }
}
