import React from 'react';
import PropTypes from 'prop-types';

import Button from './partials/button';
import HumanWebCheck from './partials/human-web-check';
import Row from './partials/row';
import TextInput from './partials/text-input';

function HumanWeb({
  HWCheckUrlStatus,
  HWStatus,
  onTextInputChange,
  syncState,
  timestamp,
  urlToCheck,
}) {
  const onButtonClick = () => {
    syncState();
  };

  const displayError = error => (
    <div>
      <p>{`ERROR: ${error.message}`}</p>

      <p>Stack:</p>
      {error.stack}
    </div>
  );

  if (HWStatus.message !== undefined || HWCheckUrlStatus.message !== undefined) {
    const error = HWStatus.message !== undefined
      ? HWStatus
      : HWCheckUrlStatus;
    return displayError(error);
  }
  return (
    <div>
      <table>
        <tbody>
          <Row>
            <a href="https://github.com/cliqz/navigation-extension/wiki/Human-web-Tests">Test cases for reference</a>
          </Row>

          <Row>
            <p>URL to be checked</p>
            <TextInput
              onTextChange={onTextInputChange}
              textInputValue={urlToCheck}
            />
          </Row>

          <Row>
            <Button
              onClick={onButtonClick}
              value="UPDATE URL / REFRESH STATE"
            />
          </Row>
        </tbody>
      </table>

      <table className="human-web-state">
        <tbody>
          <tr>
            <th colSpan="2">
              Objects related to checking URLs
            </th>
          </tr>
          <tr>
            <th>Object</th>
            <th>Current value</th>
          </tr>

          <HumanWebCheck
            currentValue={HWCheckUrlStatus.isHostPrivate}
            name={`CLIQZ.app.modules['human-web'].background.humanWeb.network.isHostNamePrivate('${urlToCheck}')`}
          />

          <HumanWebCheck
            currentValue={HWCheckUrlStatus.isPagePrivate}
            name={`CLIQZ.app.modules['human-web'].background.humanWeb.isAlreadyMarkedPrivate('${urlToCheck}')`}
          />

          <HumanWebCheck
            currentValue={HWCheckUrlStatus.quorumConsent}
            name={`CLIQZ.app.modules['human-web'].background.humanWeb.quorumConsent('${urlToCheck}')`}
          />

          <HumanWebCheck
            currentValue={HWCheckUrlStatus.host}
            name={`CLIQZ.app.modules['human-web'].background.humanWeb.network.dns.resolveHost('${urlToCheck}')`}
          />
        </tbody>
      </table>

      <table className="human-web-state">
        <tbody>
          <tr>
            <th colSpan="2">
              Generic HumanWeb status
            </th>
          </tr>
          <tr>
            <th>Object</th>
            <th>Current value</th>
          </tr>

          <HumanWebCheck
            currentValue={HWStatus.counter}
            name="CLIQZ.app.modules['human-web'].background.humanWeb.counter"
          />

          <HumanWebCheck
            currentValue={HWStatus.countryCode}
            name="CLIQZ.app.modules['human-web'].background.humanWeb.getCountryCode()"
          />

          <HumanWebCheck
            currentValue={timestamp}
            name="CLIQZ.prefs.get('config_ts')"
          />

          <HumanWebCheck
            currentValue={HWStatus.rulesets}
            name="CLIQZ.app.modules['human-web'].background.humanWeb.contentExtractor.patterns.normal.extractRules"
          />

          <HumanWebCheck
            currentValue={HWStatus.state.v}
            name="CLIQZ.app.modules['human-web'].background.humanWeb.state.v"
          />

          <HumanWebCheck
            currentValue={HWStatus.strictQueries}
            name="CLIQZ.app.modules['human-web'].background.humanWeb.strictQueries"
          />

          <HumanWebCheck
            currentValue={HWStatus.oc}
            name="CLIQZ.app.modules['human-web'].background.humanWeb.oc'"
          />

          <HumanWebCheck
            currentValue={HWStatus.allOpenPages}
            name="CLIQZ.app.modules['human-web'].background.humanWeb.allOpenPages()"
          />

          <HumanWebCheck
            currentValue={HWStatus.quorumOtherUrl}
            name="CLIQZ.app.modules['human-web'].background.humanWeb.quorumCheckOtherUrls"
          />

          <HumanWebCheck
            currentValue={HWStatus.trk}
            name="CLIQZ.app.modules['human-web'].background.humanWeb.trk"
          />
        </tbody>
      </table>
    </div>
  );
}

HumanWeb.propTypes = {
  HWCheckUrlStatus: PropTypes.shape({
    host: PropTypes.string.isRequired,
    isHostPrivate: PropTypes.bool.isRequired,
    isPagePrivate: PropTypes.object.isRequired,
    quorumConsent: PropTypes.bool.isRequired,
  }),
  HWStatus: PropTypes.shape({
    allOpenPages: PropTypes.array.isRequired,
    counter: PropTypes.number.isRequired,
    countryCode: PropTypes.string.isRequired,
    oc: PropTypes.number.isRequired,
    quorumOtherUrl: PropTypes.object.isRequired,
    rulesets: PropTypes.array.isRequired,
    state: PropTypes.shape({
      v: PropTypes.object.isRequired,
    })
      .isRequired,
    strictQueries: PropTypes.array.isRequired,
    trk: PropTypes.array.isRequired,
  }).isRequired,
  syncState: PropTypes.func.isRequired,
  timestamp: PropTypes.string.isRequired,
  urlToCheck: PropTypes.string.isRequired,
};


export default HumanWeb;
