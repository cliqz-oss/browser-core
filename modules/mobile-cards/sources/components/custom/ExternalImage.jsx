/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { Image } from 'react-native';


export default class ExternalImage extends React.Component {
  constructor(props) {
    super(props);
    this.state = { Image: null };
    this.loadImage(props);
  }

  componentWillReceiveProps(props) {
    this.loadImage(props);
  }

  loadImage(props) {
    Image.prefetch(props.source.uri)
      .then(() => {
        this.setState({
          Image: <Image {...props} />
        });
      })
      .catch(() => this.setState({ Image: null }));
  }

  render() {
    return this.state.Image;
  }
}
