import React from 'react';
import { StyleSheet, Image, View, Text } from 'react-native';
import Icon from '../partials/Icon';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import Link from '../Link';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';
import utils from '../../../core/utils';

export default class extends React.Component {

  constructor(props) {
    super(props);
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

    return <View style={styles(isInjected).social} >
      {isInjected === true &&
        <Text style={{ color: '#4A90E2', fontSize: 12, marginTop: 4 }}>{firstNewsDomain}</Text>
      }
      {this.props.data.slice(0, numberOfNews).map((link) => this.displayLink(link, isInjected))}
    </View>
  }

  agoLine(ts) {
    if (!ts) {
      return '';
    }

    const now = (Date.now() / 1000);
    const seconds = parseInt(now - ts, 10);

    const ago = AGO_CEILINGS.find(([time]) => seconds < time);

    if (ago) {
      const roundedTime = parseInt(seconds / ago[2], 10);
      const translation = utils.getLocalizedString(ago[1], roundedTime);
      return translation;
    }

    return '';
  }

  displayLink(link, isInjected) {
    const thumbnail = (link.extra && link.extra.thumbnail)
          || 'https://cdn.cliqz.com/extension/EZ/news/no-image-mobile.png';
    const tweetCount = (link.extra && link.extra.tweet_count) || null;
    const nLines = 2;
    const twitterImage = normalizeUrl('http://cdn.cliqz.com/extension/EZ/cliqz/EZ-social-twitter.svg');
    const creationTime = this.agoLine(link.extra.creation_timestamp);
    return (
      <Link to={link.url} key={link.url}>
        <View style={styles().item}>
          <Image
            source={{uri: thumbnail}}
            style={styles().image}
            resizeMode={'cover'}
          />
          <View style={{ flexDirection: 'column', justifyContent: 'flex-start', marginLeft: 6 }}>
            <Text style={styles().text} numberOfLines={nLines} adjustsFontSizeToFit minimumFontScale={0.2}>{link.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              {(tweetCount && !isInjected) &&
                <View  style={{ flexDirection: 'row', marginRight: 5, alignItems: 'center'}}>
                  <NativeDrawable
                    style={styles().twitter}
                    source={twitterImage}
                  />
                  <Text style={{ color: '#49C0F2', marginLeft: 4 }}>{tweetCount}</Text>
                </View>
              }
              <Text style={styles(isInjected).creation}>{creationTime}</Text>
            </View>
          </View>
        </View>
      </Link>
    );
  }
}

const styles = (isInjected) => StyleSheet.create({
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
    width: 65, //remember to change the right margin of text
  },
  text: {
    color: 'black',
    marginRight: 65, //the width of the image
    fontSize: 13,
    lineHeight: 20,
  },
  twitter: {
    width: 10,
    height: 10,
  },
  creation: {
    color: isInjected ? '#2CBA84': '#999',
  }
});

const AGO_CEILINGS =
[
  [0, '', 1],
  [120, 'ago1Minute', 1],
  [3600, 'agoXMinutes', 60],
  [7200, 'ago1Hour', 1],
  [86400, 'agoXHours', 3600],
  [172800, 'agoYesterday', 1],
  [604800, 'agoXDays', 86400],
  [4838400, 'ago1Month', 1],
  [29030400, 'agoXMonths', 2419200],
  [58060800, 'ago1year', 1],
  [2903040000, 'agoXYears', 29030400],
];
