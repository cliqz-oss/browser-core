import React from 'react';
import PropTypes from 'prop-types';

import Row from './partials/row';

class Telemetry extends React.Component {
  componentDidMount() {
    this.updateID = setInterval(this.props.syncState, 500);
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
      <Row key={t.session}>
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
          <Row>Telemetry updates every 500ms</Row>
          {this.showTelemetryStatus(this.props.telemetryStatus)}
        </tbody>
      </table>
    );
  }
}

Telemetry.propTypes = {
  syncState: PropTypes.func.isRequired,
  telemetryStatus: PropTypes.array.isRequired,
};

export default Telemetry;
