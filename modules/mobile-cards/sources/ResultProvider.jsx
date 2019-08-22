/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    flex: 1,
    flexDirection: 'column',
  }
});

export const ResultProvider = class extends React.Component {
  getChildContext() {
    const { result, meta, index } = this.props;
    return { result, meta, index };
  }

  render() {
    return <View style={styles.container} {...this.props} />;
  }
};

ResultProvider.childContextTypes = {
  result: PropTypes.object,
  meta: PropTypes.object,
  index: PropTypes.number,
};

export const withResult = (Component) => {
  function ComponentWithResult(props, context) {
    return (
      <Component
        {...props}
        result={context.result}
        meta={context.meta}
        index={context.index}
      />
    );
  }
  ComponentWithResult.contextTypes = {
    result: PropTypes.object,
    meta: PropTypes.object,
    index: PropTypes.number,
  };
  return ComponentWithResult;
};

export function getSelection(result, meta, index) {
  const selection = {
    action: 'click',
    elementName: 'title',
    isFromAutoCompletedUrl: false,
    isNewTab: false,
    isPrivateMode: false,
    isPrivateResult: meta.isPrivate,
    query: result.text,
    rawResult: {
      index,
      ...result,
    },
    resultOrder: meta.resultOrder,
    url: result.url,
  };
  return selection;
}
