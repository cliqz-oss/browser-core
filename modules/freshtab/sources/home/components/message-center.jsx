/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';
import TopMessages from './top-messages';
import CliqzPost from './cliqz-post';

export default class MessageCenter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      top: [],
      cliqzpost: [],
    };
  }

  componentWillReceiveProps(nextProps) {
    const messages = nextProps.messages;
    const top = [];
    const cliqzpost = [];
    Object.keys(messages).forEach((message) => {
      const msg = messages[message];
      const { position } = msg;
      if (position === 'top') {
        top.push(msg);
      } else if (position === 'post') {
        cliqzpost.push(msg);
      }
    });

    this.setState({
      top,
      cliqzpost,
    });
  }

  render() {
    const position = this.props.position;
    if (position === 'top' && this.state.top.length > 0) {
      return (
        <TopMessages
          handleLinkClick={this.props.handleLinkClick}
          messages={this.state.top}
        />
      );
    }
    if (position === 'post' && this.state.cliqzpost.length > 0) {
      return (
        <CliqzPost
          positioning={this.props.positioning}
          messages={this.state.cliqzpost}
        />
      );
    }
    return null;
  }
}

MessageCenter.propTypes = {
  handleLinkClick: PropTypes.func,
  messages: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    map: PropTypes.func
  }),
  position: PropTypes.string,
};
