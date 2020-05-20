/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';

import Button from './partials/button';
import Row from './partials/row';

class ActionButtons extends React.Component {
  state = {
    isExtReloadFinished: false,
  }

  reloadExtension = async () => {
    await this.props.cliqz.reloadExtension();
    this.setState({
      isExtReloadFinished: true,
    });
  }

  render() {
    return (
      <table>
        <tbody>
          <Row>
            <Button
              onClick={this.reloadExtension}
              value="RELOAD EXTENSION"
            />
          </Row>

          {this.state.isExtReloadFinished
          && (
            <Row>Reload finished</Row>
          )
        }
        </tbody>
      </table>
    );
  }
}

ActionButtons.propTypes = {
  cliqz: PropTypes.object.isRequired,
};

export default ActionButtons;
