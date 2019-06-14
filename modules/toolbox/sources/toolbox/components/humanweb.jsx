import React from 'react';
import PropTypes from 'prop-types';

import HumanWebCheck from './partials/human-web-check';
import RefreshState from './partials/refresh-state';
import Row from './partials/row';
import TableHeader from './partials/table-header';
import TextInput from './partials/text-input';

class HumanWeb extends React.Component {
  state = {
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
      sendQueue: [],
      dlq: [],
      sent: 0,
      history: [],
      historySummary: [],
    },
    timestamp: null,
    urlToCheck: 'twitter.com',
  }

  componentDidMount() {
    this.syncState();
  }

  syncState = async () => {
    const newState = await this.props.cliqz.getHumanWebState(this.state.urlToCheck);
    this.setState(newState);
  }

  displayError = error => (
    <div>
      <p>{`ERROR: ${error.message}`}</p>

      <p>Stack:</p>
      {error.stack}
    </div>
  );

  onTextInputChange = (v) => {
    this.setState({
      urlToCheck: v,
    });
  }

  render() {
    if (
      this.state.HWStatus.message !== undefined
      || this.state.HWCheckUrlStatus.message !== undefined
    ) {
      const error = this.state.HWStatus.message !== undefined
        ? this.state.HWStatus
        : this.state.HWCheckUrlStatus;
      return this.displayError(error);
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
                onTextChange={this.onTextInputChange}
                textInputValue={this.state.urlToCheck}
              />
            </Row>

            <RefreshState
              refreshButtonValue="UPDATE URL / REFRESH STATE"
              syncState={this.syncState}
            />
          </tbody>
        </table>

        <table className="bordered-table">
          <tbody>
            <TableHeader
              header="Objects related to checking URLs"
            />

            <tr>
              <th>Object</th>
              <th>Current value</th>
            </tr>

            <HumanWebCheck
              currentValue={this.state.HWCheckUrlStatus.isHostPrivate}
              name={`CLIQZ.app.modules['human-web'].background.humanWeb.network.isHostNamePrivate('${this.state.urlToCheck}')`}
            />

            <HumanWebCheck
              currentValue={this.state.HWCheckUrlStatus.isPagePrivate}
              name={`CLIQZ.app.modules['human-web'].background.humanWeb.isAlreadyMarkedPrivate('${this.state.urlToCheck}')`}
            />

            <HumanWebCheck
              currentValue={this.state.HWCheckUrlStatus.quorumConsent}
              name={`CLIQZ.app.modules['human-web'].background.humanWeb.quorumConsent('${this.state.urlToCheck}')`}
            />

            <HumanWebCheck
              currentValue={this.state.HWCheckUrlStatus.host}
              name={`CLIQZ.app.modules['human-web'].background.humanWeb.network.dns.resolveHost('${this.state.urlToCheck}')`}
            />
          </tbody>
        </table>

        <table className="bordered-table">
          <tbody>
            <TableHeader
              header="Generic HumanWeb status"
            />
            <tr>
              <th>Object</th>
              <th>Current value</th>
            </tr>

            <HumanWebCheck
              currentValue={this.state.HWStatus.counter}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.counter"
            />

            <HumanWebCheck
              currentValue={this.state.HWStatus.countryCode}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.getCountryCode()"
            />

            <HumanWebCheck
              currentValue={this.state.timestamp}
              name="CLIQZ.prefs.get('config_ts')"
            />

            <HumanWebCheck
              currentValue={this.state.HWStatus.rulesets}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.contentExtractor.patterns.normal.extractRules"
            />

            <HumanWebCheck
              currentValue={this.state.HWStatus.state.v}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.state.v"
            />

            <HumanWebCheck
              currentValue={this.state.HWStatus.strictQueries}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.strictQueries"
            />

            <HumanWebCheck
              currentValue={this.state.HWStatus.oc}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.oc'"
            />

            <HumanWebCheck
              currentValue={this.state.HWStatus.allOpenPages}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.allOpenPages()"
            />

            <HumanWebCheck
              currentValue={this.state.HWStatus.quorumOtherUrl}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.quorumCheckOtherUrls"
            />

            <HumanWebCheck
              currentValue={this.state.HWStatus.sendQueue}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.safebrowsingEndpoint.getSendQueue()"
            />
            <HumanWebCheck
              currentValue={this.state.HWStatus.dlq}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.safebrowsingEndpoint.dlq"
            />
            <HumanWebCheck
              currentValue={this.state.HWStatus.sent}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.safebrowsingEndpoint.history.sent"
            />
            <HumanWebCheck
              currentValue={this.state.HWStatus.history}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.safebrowsingEndpoint.history.values()"
            />
            <HumanWebCheck
              currentValue={this.state.HWStatus.historySummary}
              name="CLIQZ.app.modules['human-web'].background.humanWeb.safebrowsingEndpoint.history.values().map(x => ({ action: x.msg.action, sentAt: x.sentAt }))"
            />

          </tbody>
        </table>
      </div>
    );
  }
}

HumanWeb.propTypes = {
  cliqz: PropTypes.object.isRequired,
};

export default HumanWeb;
