import React from 'react';
import createSpananWrapper from '../../../core/helpers/spanan-module-wrapper';

import AppModules from './app-modules';
import ActionButtons from './action-buttons';
import HumanWeb from './humanweb';
import Offers from './offers';
import Preferences from './preferences';
import ResourceLoaders from './resource-loaders';
import SearchBackendConfig from './search-backend-config';
import Telemetry from './telemetry';
import ToolsShortcuts from './tools-shortcuts';

import Button from './partials/button';

const tabs = [
  'Tool shortcuts',
  'Modules list',
  'Backend endpoints',
  'Set / get prefs',
  'Action buttons',
  'HumanWeb',
  'Telemetry',
  'Offers',
  'Resource loaders',
];

export default class App extends React.Component {
  state = {
    view: 'Tool shortcuts',
  }

  componentDidMount() {
    this.background = createSpananWrapper('toolbox').createProxy();
  }

  checkView = () => {
    if (this.state.view === 'Tool shortcuts') {
      return <ToolsShortcuts />;
    }
    if (this.state.view === 'Modules list') {
      return <AppModules cliqz={this.background} />;
    }
    if (this.state.view === 'Backend endpoints') {
      return <SearchBackendConfig cliqz={this.background} />;
    }
    if (this.state.view === 'Set / get prefs') {
      return <Preferences cliqz={this.background} />;
    }
    if (this.state.view === 'Action buttons') {
      return <ActionButtons cliqz={this.background} />;
    }
    if (this.state.view === 'HumanWeb') {
      return <HumanWeb cliqz={this.background} />;
    }
    if (this.state.view === 'Telemetry') {
      return <Telemetry cliqz={this.background} />;
    }
    if (this.state.view === 'Offers') {
      return <Offers cliqz={this.background} />;
    }
    if (this.state.view === 'Resource loaders') {
      return <ResourceLoaders cliqz={this.background} />;
    }
    return <p>TEST</p>;
  }

  render() {
    return (
      <div>
        {tabs.map(tab => (
          <Button
            key={tab}
            onClick={() => { this.setState({ view: tab }); }}
            value={tab}
          />
        ))}

        <div className="modal-group">
          {this.checkView()}
        </div>
      </div>
    );
  }
}
