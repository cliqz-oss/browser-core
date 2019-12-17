/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Snippet from './partials/Snippet';
import SnippetList from './partials/SnippetList';
import { withStyles } from '../withTheme';

const SUPPORTED_DEEP_RESULTS = ['streaming', 'simple_links', 'buttons'];

const cardStyle = theme => StyleSheet.create({
  container: {
    flexDirection: 'column',
    marginVertical: 10,
    paddingLeft: theme.card.sidePadding,
    paddingRight: theme.card.sidePadding,
    backgroundColor: theme.card.bgColor,
    borderRadius: theme.card.borderRadius,
  },
});

function getDeepResults(deepResults, mainUrl, openLink) {
  return deepResults.map(result => (
    <SnippetList
      key={mainUrl + result.type}
      listKey={mainUrl + result.type}
      limit={3}
      expandStep={5}
      list={result.links.map(link => (
        <Snippet
          key={link.url}
          openLink={openLink}
          data={link}
          type={result.type}
        />
      ))}
    />
  ));
}

function getHistoryResults(urls, mainUrl, openLink) {
  if (!urls.length) {
    return null;
  }
  return (
    <SnippetList
      listKey={`${mainUrl}history`}
      limit={3}
      expandStep={5}
      list={urls.map(url => (
        <Snippet
          key={url.url}
          openLink={openLink}
          data={url}
          type="history"
        />
      ))}
    />
  );
}

const Card = ({ result, classes, openLink }) => {
  const url = result.url;
  const urls = result.data.urls || [];
  const deepResults = (result.data.deepResults || [])
    .filter(dr => SUPPORTED_DEEP_RESULTS.includes(dr.type));
  const logo = result.meta.logo;
  return (
    <View style={classes.container}>
      <Snippet openLink={openLink} data={result} type="main" logo={logo} />
      { getHistoryResults(urls, url, openLink) }
      { getDeepResults(deepResults, url, openLink) }
    </View>
  );
};

export default withStyles(cardStyle)(Card);
