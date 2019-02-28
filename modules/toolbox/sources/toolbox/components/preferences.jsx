import React from 'react';
import PropTypes from 'prop-types';

import Row from './partials/row';
import Switch from './partials/switch';
import TextInput from './partials/text-input';

const radioPrefList = [
  { shortName: 'developer', name: 'developer', prefix: 'extensions.cliqz.' },
  { shortName: 'extensionsLegacyEnabled', name: 'enabled', prefix: 'extensions.legacy.' },
  { shortName: 'offersDevFlag', name: 'offersDevFlag', prefix: 'extensions.cliqz.' },
  { shortName: 'offersLoadSignalsFromDB', name: 'offersLoadSignalsFromDB', prefix: 'extensions.cliqz.' },
  { shortName: 'offersLogsEnabled', name: 'offersLogsEnabled', prefix: 'extensions.cliqz.' },
  { shortName: 'signaturesRequired', name: 'required', prefix: 'xpinstall.signatures.' },
  { shortName: 'showConsoleLogs', name: 'showConsoleLogs', prefix: 'extensions.cliqz.' },
];

const textPrefList = [
  { shortName: 'configLocation', name: 'config_location', prefix: 'extensions.cliqz.' },
  { shortName: 'loggerLevel', name: 'logger.offers-v2.level', prefix: 'extensions.cliqz.' },
  { shortName: 'offersTelemetryFreq', name: 'offersTelemetryFreq', prefix: 'extensions.cliqz.', type: 'number' },
  { shortName: 'triggersBE', name: 'triggersBE', prefix: 'extensions.cliqz.' },
];

function Preferences({
  cliqz,
  preferencesStatus,
  syncState,
}) {
  const setPref = async ({ name, value, prefix }) => {
    await cliqz.setPref(name, value, prefix);
    await syncState();
  };

  const onTextInputChange = async ({ event, name, prefix, isNumber }) => {
    const value = isNumber ? parseInt(event.target.value, 10) : event.target.value;
    await setPref({ name, value, prefix });
  };

  const renderRadioPrefList = () => radioPrefList.map(pref => (
    <Row key={pref.shortName}>
      {`${pref.shortName}:`}

      <Switch
        toggleComponent={ev => setPref({
          name: pref.name,
          value: ev.target.checked,
          prefix: pref.prefix
        })}
        isChecked={preferencesStatus[pref.shortName]}
      />
    </Row>
  ));

  const renderTextPrefList = () => textPrefList.map(pref => (
    <Row key={pref.shortName}>
      {`${pref.shortName}:`}

      <TextInput
        onTextChange={event => onTextInputChange({
          event,
          name: pref.name,
          prefix: pref.prefix,
          isNumber: pref.type === 'number'
        })}
        textInputValue={preferencesStatus[pref.shortName]}
      />
    </Row>
  ));

  return (
    <table>
      <tbody>
        {renderRadioPrefList()}
        {renderTextPrefList()}
      </tbody>
    </table>
  );
}

Preferences.propTypes = {
  cliqz: PropTypes.object.isRequired,
  preferencesStatus: PropTypes.object.isRequired,
  syncState: PropTypes.func.isRequired,
};

export default Preferences;
