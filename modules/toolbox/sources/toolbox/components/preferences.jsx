import React from 'react';
import PropTypes from 'prop-types';

import CustomPref from './partials/custom-pref';
import NumericInput from './partials/numeric-input';
import Row from './partials/row';
import Switch from './partials/switch';
import TableHeader from './partials/table-header';
import TextInput from './partials/text-input';

const radioPrefList = [
  'developer',
  'offersDevFlag',
  'offersLoadSignalsFromDB',
  'offersLogsEnabled',
  'showConsoleLogs',
];

const textPrefList = [
  'config_location',
  'logger.offers-v2.level',
  'triggersBE',
];

const numericPrefList = [
  'offersTelemetryFreq',
];

class Preferences extends React.Component {
  state = {
    preferencesStatus: {
      configLocation: '',
      developer: false,
      extensionsLegacyEnabled: false,
      loggerLevel: 'debug',
      offersDevFlag: false,
      offersLoadSignalsFromDB: true,
      offersLogsEnabled: false,
      offersTelemetryFreq: 10,
      showConsoleLogs: false,
      signaturesRequired: false,
      triggersBE: '',
    },
  }

  componentDidMount() {
    this.syncState();
  }

  syncState = async () => {
    const newState = await this.props.cliqz.getPreferencesState();
    this.setState(newState);
  }

  setPref = async ({ name, value }) => {
    await this.props.cliqz.setPref(name, value);
    await this.syncState();
  };

  onTextInputChange = async ({ value, name }) => {
    await this.setPref({ name, value });
  };

  renderRadioPrefList = () => radioPrefList.map(pref => (
    <Row key={pref}>
      {`${pref}:`}

      <Switch
        toggleComponent={ev => this.setPref({
          name: pref,
          value: ev.target.checked,
        })}
        isChecked={Boolean(this.state.preferencesStatus[pref])}
      />
    </Row>
  ));

  renderTextPrefList = () => textPrefList.map(pref => (
    <Row key={pref}>
      {`${pref}:`}

      <TextInput
        onTextChange={value => this.onTextInputChange({
          value,
          name: pref,
        })}
        textInputValue={this.state.preferencesStatus[pref]}
      />
    </Row>
  ));

  renderNumericPrefList = () => numericPrefList.map(pref => (
    <Row key={pref}>
      {`${pref}:`}

      <NumericInput
        minValue={1}
        onNumberChange={value => this.onTextInputChange({
          value: parseInt(value, 10),
          name: pref,
        })}
        textInputValue={this.state.preferencesStatus.offersTelemetryFreq}
      />
    </Row>
  ));

  render() {
    return (
      <div>
        <table>
          <CustomPref
            setPref={this.setPref}
          />
        </table>

        <table>
          <tbody>
            <TableHeader
              header="Other preferences:"
            />
            {this.renderRadioPrefList()}
            {this.renderTextPrefList()}
            {this.renderNumericPrefList()}
          </tbody>
        </table>
      </div>
    );
  }
}

Preferences.propTypes = {
  cliqz: PropTypes.object.isRequired,
};

export default Preferences;
