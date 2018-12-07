import React from 'react';
import PropTypes from 'prop-types';

const radioPrefList = [
  { shortName: 'showConsoleLogs', name: 'showConsoleLogs', prefix: 'extensions.cliqz.' },
  { shortName: 'extensionsLegacyEnabled', name: 'enabled', prefix: 'extensions.legacy.' },
  { shortName: 'signaturesRequired', name: 'required', prefix: 'xpinstall.signatures.' },
  { shortName: 'developer', name: 'developer', prefix: 'extensions.cliqz.' },
  { shortName: 'offersDevFlag', name: 'offersDevFlag', prefix: 'extensions.cliqz.' },
  { shortName: 'offersLogsEnabled', name: 'offersLogsEnabled', prefix: 'extensions.cliqz.' },
  { shortName: 'offersLoadSignalsFromDB', name: 'offersLoadSignalsFromDB', prefix: 'extensions.cliqz.' },
];

const textPrefList = [
  { shortName: 'triggersBE', name: 'triggersBE', prefix: 'extensions.cliqz.' },
  { shortName: 'offersTelemetryFreq', name: 'offersTelemetryFreq', prefix: 'extensions.cliqz.', type: 'number' },
  { shortName: 'loggerLevel', name: 'logger.offers-v2.level', prefix: 'extensions.cliqz.' },
];

function LogsList(props) {
  const setPref = async ({ name, value, prefix }) => {
    await props.cliqz.setPref(name, value, prefix);
    await props.syncState();
  };

  const onTextInputChange = async ({ event, name, prefix, isNumber }) => {
    const value = isNumber ? parseInt(event.target.value, 10) : event.target.value;
    await setPref({ name, value, prefix });
  };

  return (
    <div className={`modal-item ${props.modalClass}`}>
      <div className="modal-header">
        Change prefs
      </div>

      <table>
        {radioPrefList.map(pref => (
          <tr
            key={pref.shortName}
          >
            <td>{`${pref.shortName}:`}</td>
            <td>
              <label htmlFor={`${pref.shortName}-on`}>
                <input
                  type="radio"
                  id={`${pref.shortName}-on`}
                  name={`${pref.shortName}-on`}
                  checked={props[pref.shortName]}
                  onChange={ev => setPref({
                    name: pref.name,
                    value: ev.target.checked,
                    prefix: pref.prefix
                  })}
                />
                true
              </label>
            </td>

            <td>
              <label htmlFor={`${pref.shortName}-off`}>
                <input
                  type="radio"
                  id={`${pref.shortName}-off`}
                  name={`${pref.shortName}-off`}
                  checked={!props[pref.shortName]}
                  onChange={ev => setPref({
                    name: pref.name,
                    value: !ev.target.checked,
                    prefix: pref.prefix
                  })}
                />
                false
              </label>
            </td>
          </tr>
        ))}

        {textPrefList.map(pref => (
          <tr
            key={pref.shortName}
          >
            <td>{`${pref.shortName}:`}</td>
            <td colSpan="2">
              <input
                className="textinput"
                type="text"
                name={pref.shortName}
                value={props[pref.shortName]}
                onChange={event => onTextInputChange({
                  event,
                  name: pref.name,
                  prefix: pref.prefix,
                  isNumber: pref.type === 'number'
                })}
              />
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
}

LogsList.propTypes = {
  cliqz: PropTypes.func.isRequired,
  modalClass: PropTypes.string.isRequired,
  syncState: PropTypes.func.isRequired,
};

export default LogsList;
