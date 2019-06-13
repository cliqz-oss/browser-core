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
    customPrefName: '',
    preferencesStatus: {
      configLocation: '',
      custom: 'N/A',
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

  syncState = async ({ customPrefName = '' } = {}) => {
    const newState = await this.props.cliqz.getPreferencesState(customPrefName);
    this.setState(newState);
  }

  setPref = async ({ name, value }) => {
    await this.props.cliqz.setPref(name, value);
    await this.syncState();
  };

  onTextInputChange = async ({ value, name }) => {
    await this.setPref({ name, value });
  };

  onGetTextInputChange = async ({ value }) => {
    this.setState({
      customPrefName: value,
    });
    await this.syncState({ customPrefName: value });
  }

  renderRadioPrefList = () => radioPrefList.map((pref) => {
    const prefStatus = this.state.preferencesStatus[pref];
    const isChecked = prefStatus !== 'N/A'
      ? Boolean(prefStatus)
      : false;

    return (
      <Row key={pref}>
        {`${pref}:`}

        <Switch
          toggleComponent={ev => this.setPref({
            name: pref,
            value: ev.target.checked,
          })}
          isChecked={isChecked}
        />

        {this.renderErrorValue(pref)}

      </Row>
    );
  });

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

      {this.renderErrorValue(pref)}

    </Row>
  ));

  renderErrorValue = prefName =>
    (this.state.preferencesStatus[prefName] === 'N/A') && 'N/A (default value used)'

  renderPrefGetter = () => (
    <Row>
      <TextInput
        onTextChange={value => this.onGetTextInputChange({ value })}
        placeholder="Custom pref name"
        textInputValue={this.state.customPrefName}
      />

      {`Value: ${this.state.preferencesStatus.custom.toString()}`}
    </Row>
  );

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
              header="Get a custom pref:"
            />
            {this.renderPrefGetter()}
          </tbody>
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
