/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from './Icon';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import { withStyles } from '../../withTheme';

const styles = theme => StyleSheet.create({
  history: {
    width: theme.snippet.historyIconSize,
    height: theme.snippet.historyIconSize,
    marginTop: (theme.snippet.titleLineHeight - theme.snippet.historyIconSize) / 2,
  },
  symbolContainer: {
    width: theme.snippet.mainIconSize,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginRight: theme.snippet.iconMarginRight,
  },
  iconARGB: {
    color: theme.snippet.iconColorARGB,
  },
  bullet: {
    backgroundColor: theme.snippet.iconColor,
    borderColor: theme.snippet.iconColor,
    width: theme.snippet.bulletIconSize,
    height: theme.snippet.bulletIconSize,
    marginTop: (theme.snippet.titleLineHeight - theme.snippet.bulletIconSize) / 2,
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
