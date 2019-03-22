import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import SnippetIcon from './SnippetIcon';
import Link from '../Link';
import { withStyles } from '../../withTheme';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import {
  snippetTitleFontSize,
  snippetTitleLineHeight,
  snippetMainIconSize,
  snippetSubtitleFontSize,
  snippetIconMarginRight,
  cardSidePadding,
} from '../../themes';

const httpsLockWidth = 9;
const httpsLockMarginRight = 5;

const cardStyle = (theme, themeDetails) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingRight: (2 * cardSidePadding) + snippetMainIconSize + snippetIconMarginRight,
    paddingTop: 7,
    paddingBottom: 6
  },
  mainTitle: {
    color: themeDetails[theme].snippet.titleColor,
    fontSize: snippetTitleFontSize,
    lineHeight: snippetTitleLineHeight,
    marginTop: (snippetMainIconSize - snippetTitleLineHeight) / 2,
  },
  subTitle: {
    color: themeDetails[theme].snippet.titleColor,
    fontSize: snippetSubtitleFontSize,
    lineHeight: snippetTitleLineHeight,
  },
  visitedTitle: {
    color: themeDetails[theme].snippet.visitedTitleColor,
  },
  urlContainer: {
    flexDirection: 'row',
    paddingRight: httpsLockWidth + httpsLockMarginRight,
    alignItems: 'center',
    paddingBottom: 2
  },
  url: {
    color: themeDetails[theme].snippet.urlColor,
    fontSize: 13.5,
  },
  lock: {
    width: httpsLockWidth,
    height: httpsLockWidth * 1.3,
    marginRight: httpsLockMarginRight,
  },
  lockColor: {
    color: themeDetails[theme].snippet.urlColor
  },
  description: {
    color: themeDetails[theme].snippet.descriptionColor,
    fontSize: 14.5,
    marginTop: 2,
  }
});

const getDescription = (props, description) => {
  if (description) {
    return (
      <Text numberOfLines={2} style={props.classes.description}>
        {description}
      </Text>
    );
  }
  return null;
};

const isHistory = props => props.data.provider === 'history';

const Snippet = (props) => {
  const type = props.type;
  const { title, friendlyUrl, description, provider, url } = props.data;
  const logo = props.logo;
  const titleLines = type === 'main' ? 2 : 1;
  const titleStyle = type === 'main' ? [props.classes.mainTitle] : [props.classes.subTitle];
  if (isHistory(props)) {
    titleStyle.push(props.classes.visitedTitle);
  }
  return (
    // eslint-disable-next-line jsx-a11y/anchor-is-valid
    <Link onPress={() => props.openLink(url, type)}>
      <View style={props.classes.container}>
        <SnippetIcon type={type} logo={logo} provider={provider} />
        <View style={props.classes.rightContainer}>
          <Text numberOfLines={titleLines} style={titleStyle}>{title}</Text>
          <View
            accessibilityLabel="https-lock"
            accessible={false}
            style={props.classes.urlContainer}
          >
            <NativeDrawable
              style={props.classes.lock}
              color={props.classes.lockColor.color}
              source={normalizeUrl('https_lock.svg')}
            />
            <Text numberOfLines={1} style={props.classes.url}>{friendlyUrl}</Text>
          </View>
          { getDescription(props, description) }
        </View>
      </View>
    </Link>
  );
};

export default withStyles(cardStyle)(Snippet);
