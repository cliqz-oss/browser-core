/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import createModuleWrapper from '../../../core/helpers/action-module-wrapper';
import cliqz from '../../cliqz';

import Welcome from './welcome';
import InstallFF from './installFF';
import Profiles from './profiles';
import Uninstall from './uninstall';
import GoodBye from './goodbye';

export default class App extends React.Component {
  state = {
    currentStep: 0,
    error: '',
    migrationState: 'init',
  }

  componentDidMount() {
    this.background = createModuleWrapper('offboarding');
  }

  getProfiles = () => cliqz.onboarding.getUserProfileNames();

  handleNavigation = step => this.setState({ currentStep: step });

  startMigration = (profiles) => {
    this.setState({ migrationState: 'started' });
    cliqz.onboarding.startMigration(profiles)
      .then(() => this.setState({ migrationState: 'done' }))
      .catch(() => this.setState({ migrationState: 'init', error: 'migration error' }));
  }

  render() {
    const {
      currentStep,
      error,
      migrationState
    } = this.state;

    return (
      <div className="app">
        <div className="app-layouts">
          <div className="info-layout">
            <div className="info">
              {
                currentStep === 0
                && (
                <Welcome
                  onClick={this.handleNavigation}
                />
                )
              }
              {
                currentStep === 1
                && (
                <InstallFF
                  onClick={this.handleNavigation}
                />
                )
              }
              {
                currentStep === 2
                && (
                <Profiles
                  getProfiles={this.getProfiles}
                  onClick={this.handleNavigation}
                  migrationState={migrationState}
                  startMigration={this.startMigration}
                  error={error}
                />
                )
              }
              {
                currentStep === 3
                && (
                <Uninstall
                  onClick={this.handleNavigation}
                />
                )
              }
              {
                currentStep === 4
                && (
                <GoodBye />
                )
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}
