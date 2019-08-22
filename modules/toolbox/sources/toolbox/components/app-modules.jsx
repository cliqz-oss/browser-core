/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';

import Row from './partials/row';
import Switch from './partials/switch';

class AppModules extends React.Component {
  state = {
    modules: [],
  }

  componentDidMount() {
    this.syncState();
  }

  syncState = async () => {
    const newState = await this.props.cliqz.getModulesState();
    this.setState(newState);
  }

  moduleStateChangeAction = async (moduleId, { isEnabled }) => {
    if (isEnabled) {
      await this.props.cliqz.enableModule(moduleId);
    } else {
      this.props.cliqz.disableModule(moduleId);
    }
    await this.syncState();
  };

  renderModuleList = () => this.state.modules.map(item =>
    (
      <Row key={item.name}>
        {`${item.name} (loading time: ${item.loadingTime})`}

        <Switch
          isChecked={item.isEnabled}
          toggleComponent={() =>
            this.moduleStateChangeAction(item.name, { isEnabled: !item.isEnabled })}
        />
      </Row>
    ));

  render() {
    return (
      <table>
        <tbody>
          {this.renderModuleList()}
        </tbody>
      </table>
    );
  }
}

AppModules.propTypes = {
  cliqz: PropTypes.object.isRequired,
};

export default AppModules;
