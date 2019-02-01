import React from 'react';
import createSpananWrapper from '../../../core/helpers/spanan-module-wrapper';

import AppModules from './app-modules';
import ActionButtons from './action-buttons';
import HumanWeb from './humanweb';
import ModalCell from './partials/modal-cell';
import Pane from './partials/pane';
import Preferences from './preferences';
import SearchBackendConfig from './search-backend-config';
import Tabs from './partials/tabs';
import ToolsShortcuts from './tools-shortcuts';

export default class App extends React.Component {
  state = {
    developer: false,
    endpointsUrl: '',
    extensionsLegacyEnabled: false,
    HWCheckUrlStatus: {
      host: '',
      isHostPrivate: null,
      isPagePrivate: null,
      quorumConsent: '',
    },
    HWStatus: {
      allOpenPages: [],
      counter: -1,
      countryCode: '',
      oc: null,
      quorumOtherUrl: '',
      rulesets: [],
      state: {},
      strictQueries: [],
      trk: [],
    },
    loggerLevel: 'debug',
    modules: [],
    offersDevFlag: false,
    offersLoadSignalsFromDB: true,
    offersLogsEnabled: false,
    offersTelemetryFreq: 10,
    showConsoleLogs: false,
    signaturesRequired: false,
    timestamp: null,
    triggersBE: '',
    urlToCheck: 'twitter.com',
  }

  componentDidMount() {
    this.background = createSpananWrapper('toolbox').createProxy();
    this.syncState();
  }

  syncState = async () => {
    const newState = await this.background.getState(this.state.urlToCheck);
    this.setState(newState);
  }

  onTextInputChange = (v) => {
    this.setState({
      urlToCheck: v,
    });
  }

  render() {
    if (this.state.endpointsUrl === '') {
      return null;
    }

    return (
      <Tabs
        selected={0}
        syncState={this.syncState}
      >
        <Pane label="Tools shortcuts">
          <ModalCell modalClass="first">
            <ToolsShortcuts />
          </ModalCell>
        </Pane>
        <Pane label="Modules + endpoints">
          <ModalCell
            modalClass="first"
            modalHeader="Cliqz modules list"
          >
            <AppModules
              cliqz={this.background}
              modules={this.state.modules}
              syncState={this.syncState}
            />
          </ModalCell>

          <ModalCell
            modalClass="second"
            modalHeader="Change search backend endpoints"
          >
            <SearchBackendConfig
              cliqz={this.background}
              endpointsUrl={this.state.endpointsUrl}
              syncState={this.syncState}
            />
          </ModalCell>
        </Pane>

        <Pane label="Prefs + reload">
          <ModalCell
            modalClass="first"
            modalHeader="Change prefs"
          >
            <Preferences
              cliqz={this.background}
              developer={this.state.developer}
              extensionsLegacyEnabled={this.state.extensionsLegacyEnabled}
              loggerLevel={this.state.loggerLevel}
              offersDevFlag={this.state.offersDevFlag}
              offersLoadSignalsFromDB={this.state.offersLoadSignalsFromDB}
              offersLogsEnabled={this.state.offersLogsEnabled}
              offersTelemetryFreq={this.state.offersTelemetryFreq}
              showConsoleLogs={this.state.showConsoleLogs}
              signaturesRequired={this.state.signaturesRequired}
              syncState={this.syncState}
              triggersBE={this.state.triggersBE}
            />
          </ModalCell>

          <ModalCell
            modalClass="second"
          >
            <ActionButtons
              cliqz={this.background}
            />
          </ModalCell>
        </Pane>

        <Pane label="HumanWeb">
          <ModalCell
            modalClass="first"
            modalHeader="HumanWeb"
          >
            <HumanWeb
              HWCheckUrlStatus={this.state.HWCheckUrlStatus}
              HWStatus={this.state.HWStatus}
              onTextInputChange={this.onTextInputChange}
              syncState={this.syncState}
              timestamp={this.state.timestamp}
              urlToCheck={this.state.urlToCheck}
            />
          </ModalCell>
        </Pane>
      </Tabs>
    );
  }
}
