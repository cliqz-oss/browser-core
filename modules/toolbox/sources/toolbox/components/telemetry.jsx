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
import TableHeader from './partials/table-header';

class Telemetry extends React.Component {
  state = {
    telemetryStatus: [],
  }

  componentDidMount() {
    this.updateID = setInterval(this.syncState, 500);
    this.syncState();
  }

  syncState = async () => {
    const newState = await this.props.cliqz.getTelemetryState();
    this.setState(newState);
  }

  componentWillUnmount() {
    clearInterval(this.updateID);
  }

  removeSessionKey = (fullTelemetry) => {
    const telemetryWithoutSession = fullTelemetry;
    delete telemetryWithoutSession.session;
    return telemetryWithoutSession;
  };

  showTelemetryStatus = (telemetry) => {
    if (telemetry.length === 0) {
      return <Row>No telemetry</Row>;
    }
    return telemetry.map(t => (
      <Row key={`${t.session}${t.seq}`}>
        <pre title={JSON.stringify(t, null, 2)}>
          {JSON.stringify(this.removeSessionKey(t))}
        </pre>
      </Row>
    ));
  }

  render() {
    return (
      <table>
        <tbody>
          <TableHeader
            header="Telemetry updates every 500ms"
          />
          {this.showTelemetryStatus(this.state.telemetryStatus)}
        </tbody>
      </table>
    );
  }
}

Telemetry.propTypes = {
  cliqz: PropTypes.object.isRequired,
};

export default Telemetry;
