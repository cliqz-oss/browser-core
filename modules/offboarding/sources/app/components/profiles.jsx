/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

export default class App extends React.Component {
  state = {
    defaultProfile: '',
    profiles: [],
    selected: new Map()
  };

  componentDidMount() {
    this.props.getProfiles().then(({ profiles, default: defaultProfile }) => {
      this.setState({ profiles, defaultProfile });
    });
  }

  startMigration = () => {
    const selectedProfiles = Array.from(this.state.selected).filter(x => x[1]).map(x => x[0]);
    this.props.startMigration(selectedProfiles);
  }

  handleChange = (e) => {
    const item = e.target.name;
    const isChecked = e.target.checked;
    this.setState(prevState => ({ selected: prevState.selected.set(item, isChecked) }));
  }

  render() {
    const { error, migrationState, onClick } = this.props;
    const { defaultProfile, profiles } = this.state;

    return (
      <div className="info-block">
        <div className="info-block-content">
          <div className="info-headline no-logo  welcome-headline">
            <div>Profiles from Cliqz</div>
            <div className="welcome-description left-align">
              {
                profiles.map(p => (
                  <div className="checkbox">
                    <label key={p}><input name={p} type="checkbox" defaultChecked={defaultProfile === p} onChange={this.handleChange} />{p}</label>
                  </div>
                ))
              }
            </div>
            <p><center>{error}</center></p>
          </div>
        </div>
        <div className="info-block-ctrl">
          {
            migrationState === 'init'
            && (
            <button
              type="button"
              className="welcome-ctrl-content"
              data-index="1"
              onClick={this.startMigration}
            >
              Start Migration
            </button>
            )
          }
          {
            migrationState === 'started'
            && (
            <button
              type="button"
              className="welcome-ctrl-content"
              data-index="1"
              disabled={migrationState !== 'done'}
            >
              Migration in progress
            </button>
            )
          }
          {
            migrationState === 'done'
            && (
            <button
              type="button"
              className="welcome-ctrl-content"
              data-index="1"
              onClick={() => onClick(3)}
            >
              Next
            </button>
            )
          }
        </div>
      </div>
    );
  }
}
