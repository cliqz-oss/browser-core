import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from './Icon';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import { withStyles } from '../../withTheme';
import {
  snippetTitleLineHeight,
  snippetMainIconSize,
  snippetHistoryIconSize,
  snippetBulletIconSize,
  snippetIconMarginRight,
} from '../../themes';

const styles = (theme, themeDetails) => StyleSheet.create({
  history: {
    width: snippetHistoryIconSize,
    height: snippetHistoryIconSize,
    marginTop: (snippetTitleLineHeight - snippetHistoryIconSize) / 2,
  },
  symbolContainer: {
    width: snippetMainIconSize,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginRight: snippetIconMarginRight,
  },
  iconARGB: {
    color: themeDetails[theme].snippet.iconColorARGB,
  },
  bullet: {
    backgroundColor: themeDetails[theme].snippet.iconColor,
    borderColor: themeDetails[theme].snippet.iconColor,
    width: snippetBulletIconSize,
    height: snippetBulletIconSize,
    marginTop: (snippetTitleLineHeight - snippetBulletIconSize) / 2,
    borderRadius: 1,
  },
});

function getHistorySymbol(props) {
  return (
    <NativeDrawable
      style={props.classes.history}
      source={normalizeUrl('ic_history_white.svg', { isNative: true })}
      color={props.classes.iconARGB.color}
    />
  );
}

function getIcon(logo) {
  return (
    <Icon
      width={28}
      height={28}
      logoDetails={logo}
    />
  );
}

const SnippetIcon = (props) => {
  const provider = props.provider;
  const type = props.type;
  const logo = props.logo;
  let symbol;
  if (type !== 'main' && provider === 'history') {
    symbol = getHistorySymbol(props);
  } else {
    switch (type) {
      case 'main':
        symbol = getIcon(logo);
        break;
      default:
        symbol = <View style={props.classes.bullet} />;
    }
  }
  return (
    <View style={props.classes.symbolContainer}>
      {symbol}
    </View>
  );
};

export default withStyles(styles)(SnippetIcon);
