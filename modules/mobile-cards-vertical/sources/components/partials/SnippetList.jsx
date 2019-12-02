/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { FlatList, View, Text, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import NativeDrawable, { normalizeUrl } from '../custom/NativeDrawable';
import { getMessage } from '../../../core/i18n';
import { withStyles } from '../../withTheme';

const styles = theme => StyleSheet.create({
  list: {
    marginTop: 4
  },
  footer: {
    flexDirection: 'row',
    paddingTop: 11,
    paddingBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopColor: theme.snippet.separatorColor,
    borderTopWidth: 0.5,
  },
  footerText: {
    fontSize: 12.5,
    color: theme.snippet.descriptionColor,
  },
  arrow: {
    height: 8,
    width: 12,
    marginLeft: 5,
  },
  separatorStyle: {
    marginTop: 0,
    marginBottom: 0,
    borderTopColor: theme.snippet.separatorColor,
    borderTopWidth: 0.5,
    marginLeft: 29,
  }
});

class SnippetList extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      limit: props.limit,
    };
  }

  onFooterPressed = (isCollapsed) => {
    if (isCollapsed) {
      this.setState(({ limit }) => ({ limit: limit + this.props.expandStep }));
    } else {
      this.setState({ limit: this.props.limit });
    }
  }

  getFooter = (isCollapsed, classes) => {
    if (this.props.list.length <= this.props.limit) {
      return null;
    }
    const footerText = getMessage(isCollapsed ? 'expand' : 'collapse');
    const arrowImage = normalizeUrl('arrow-down.svg');
    const arrowAngle = { transform: [{ rotateX: isCollapsed ? '0deg' : '180deg' }] };
    return (
      <TouchableWithoutFeedback
        onPress={() => this.onFooterPressed(isCollapsed)}
      >
        <View style={classes.footer}>
          <Text style={classes.footerText}>{footerText.toUpperCase()}</Text>
          <NativeDrawable
            source={arrowImage}
            style={[classes.arrow, arrowAngle]}
            color="#9c9c9c"
          />
        </View>
      </TouchableWithoutFeedback>
    );
  }

  render() {
    const limit = this.state.limit;
    const isCollapsed = this.props.list.length > limit;
    const data = this.props.list.slice(0, limit);
    return (
      <FlatList
        style={this.props.classes.list}
        keyExtractor={item => item.key}
        data={data}
        renderItem={({ item }) => item}
        ItemSeparatorComponent={() => <View style={this.props.classes.separatorStyle} />}
        ListFooterComponent={this.getFooter(isCollapsed, this.props.classes)}
        ListHeaderComponent={() => <View style={this.props.classes.separatorStyle} />}
        listKey={this.props.listKey}
      />
    );
  }
}

export default withStyles(styles)(SnippetList);
