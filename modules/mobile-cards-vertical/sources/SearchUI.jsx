/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import CardList from './components/CardList';
import QuerySuggestions from './components/QuerySuggestions';
import { withStyles } from './withTheme';

const styles = theme => StyleSheet.create({
  container: {
    backgroundColor: theme.container.bgColor,
    flex: 1,
    flexDirection: 'column',
  },
});

const BLOCKED_TEMPLATES = ['calculator', 'currency', 'flight'];

function isResultAllowed({ template, provider, type }) {
  return (
    !BLOCKED_TEMPLATES.includes(template)
    && type !== 'navigate-to'
    && Boolean(provider)
    && provider !== 'rich-header' // promises sometimes arrive to ui
  );
}

const SearchUI = (props) => {
  const { results = [], suggestions = [], meta = {} } = props;
  const filteredResults = results.filter(isResultAllowed);
  const style = {
    ...props.classes.container,
    ...(props.style || {})
  };

  return (
    <View
      accessible={false}
      accessibilityLabel="search-results"
      style={style}
    >
      <CardList
        results={filteredResults}
        meta={meta}
        separator={props.separator}
        header={props.header}
        footer={props.footer}
        style={props.cardListStyle}
      />
      <QuerySuggestions query={results[0] && results[0].text} suggestions={suggestions} />
    </View>
  );
};

export default withStyles(styles)(SearchUI);
