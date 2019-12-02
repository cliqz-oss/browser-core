/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from './partials/Icon';
import Link from './Link';
import NativeDrawable from './custom/NativeDrawable';
import { withStyles } from '../withTheme';
import { getMessage } from '../../core/i18n';

const styles = theme => StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: theme.searchEngine.buttonBgColor,
    color: theme.searchEngine.buttonColor,
    flexDirection: 'row',
    fontSize: 13,
    borderRadius: 25,
    padding: 5,
    paddingRight: 15,
    marginRight: 5,
    marginLeft: 5,

    alignItems: 'center',
    width: 275,

  },
  iconWrapper: {
    borderRadius: 15,
    overflow: 'hidden',
    marginRight: 10,
  },
  buttonText: {
    color: theme.searchEngine.buttonColor,
    paddingRight: 30,
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  text: {
    margin: 10,
    fontSize: 11,
    color: theme.searchEngine.textColor
  },
  ghosty: {
    height: 32,
    width: 40,
    marginTop: 35,
    marginBottom: 9,
  },
  ghostyColor: {
    color: theme.searchEngine.ghostyColorARGB
  },
  footer: {
    marginBottom: 35
  }
});

class SearchEngineCard extends React.Component {
  shouldComponentUpdate({ result }) {
    this.url = result.url; // set current url and don't update the whole view
    return result.meta.domain !== this.props.result.meta.domain;
  }

  render() {
    const { result, classes, openLink } = this.props;
    const { data, meta, url } = result;
    const searchWith = getMessage('search_with', data.extra.searchEngineName);
    return (
      <View style={classes.container}>
        <Text style={classes.text}>{getMessage('search_use_complementary')}</Text>
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <Link onPress={() => openLink(this.url || url)}>
          <View style={classes.button}>
            <View style={classes.iconWrapper}>
              <Icon
                height={30}
                width={30}
                logoDetails={meta.logo}
              />
            </View>
            <Text style={classes.buttonText} numberOfLines={1}>
              {searchWith.toUpperCase()}
            </Text>
          </View>
        </Link>
        <NativeDrawable
          source="ic_ghosty"
          color={classes.ghostyColor.color}
          style={classes.ghosty}
        />
        <Text style={classes.footer}>{getMessage('ghost_search_is_private')}</Text>
      </View>
    );
  }
}

export default withStyles(styles)(SearchEngineCard);
