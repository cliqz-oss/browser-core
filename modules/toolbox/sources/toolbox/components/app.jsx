import React from 'react';
import ModulesList from './modules-list';
import EndpointsList from './endpoints-list';
import Reload from './reload';
import LogsList from './logs-list';
import Tabs from './tabs';
import Pane from './pane';
import createSpananWrapper from '../../../core/helpers/spanan-module-wrapper';

export default class App extends React.Component {
  state = {
    modules: [],
    endpointsUrl: '',
    showConsoleLogs: false,
    extensionsLegacyEnabled: false,
    signaturesRequired: false,
    developer: false,
    offersDevFlag: false,
    offersLogsEnabled: false,
    triggersBE: '',
    offersLoadSignalsFromDB: true,
    offersTelemetryFreq: 10,
    loggerLevel: 'debug',
  }

  async componentDidMount() {
    this.background = createSpananWrapper('toolbox').createProxy();
    await this.syncState();
  }

  syncState = async () => {
    this.setState(
      await this.background.getState(),
    );
  }

  render() {
    if (this.state.endpointsUrl === '') {
      return null;
    }

    return (
      <Tabs selected={0}>
        <Pane label="Modules + endpoints">
          <div className="modal-group">
            <ModulesList
              modules={this.state.modules}
              cliqz={this.background}
              syncState={this.syncState}
              modalClass="first"
            />

            <EndpointsList
              endpointsUrl={this.state.endpointsUrl}
              cliqz={this.background}
              modalClass="second"
            />
          </div>
        </Pane>

        <Pane label="Prefs + reload">
          <div className="modal-group">
            <LogsList
              cliqz={this.background}
              syncState={this.syncState}
              showConsoleLogs={this.state.showConsoleLogs}
              extensionsLegacyEnabled={this.state.extensionsLegacyEnabled}
              signaturesRequired={this.state.signaturesRequired}
              developer={this.state.developer}
              offersDevFlag={this.state.offersDevFlag}
              offersLogsEnabled={this.state.offersLogsEnabled}
              triggersBE={this.state.triggersBE}
              offersLoadSignalsFromDB={this.state.offersLoadSignalsFromDB}
              offersTelemetryFreq={this.state.offersTelemetryFreq}
              loggerLevel={this.state.loggerLevel}
              modalClass="first"
            />
            <Reload
              cliqz={this.background}
              modalClass="second"
            />
          </div>
        </Pane>
      </Tabs>
    );
  }
}
