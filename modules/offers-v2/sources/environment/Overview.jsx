import React from 'react';
import styled from 'styled-components';

import createModuleWrapper from '../../core/helpers/action-module-wrapper';

const Header = styled.header`
  background-color: #ed6e50;
  color: white;
  padding: 5px 20px;
`;

const Main = styled.main`
  width: 95%;
  height: 100%;
  margin: 0 auto;
  padding: 10px;
  border: 0;

  table {
    border-spacing: 0px;
    border-collapse: collapse;

    td {
      vertical-align: top;
    }
  }

  &.loading {
    pointer-events: none;
    opacity: 0.4;
  }

  [title] {
    color: #1a0dab;
    cursor: pointer;
  }

  > table {
    width: 100%;
    height: 100%;
  }

  td {
    padding: 5px;
  }

  textarea {
    width: 100%;
    height: 100%;
  }

  .borderedTr td {
    border: 1px solid black;
  }

  input {
    padding: 5px 10px;
    width: 100%;
    min-width: 100px;
  }
`;

const jsonPrinter = json => JSON.stringify(json, 0, 2);

const Row = ({ type, value }) => {
  let shortValue = value;
  let longValue = value;

  if (value.size !== undefined && typeof value.keys === 'function') {
    // instanceof Map does not work :/
    shortValue = value.size;
    longValue = [...value.entries()];
  } else if (Array.isArray(value)) {
    shortValue = `${Object.keys(value).length}`;
  } else if (typeof value === 'boolean') {
    shortValue = JSON.stringify(value);
  } else if (typeof value === 'string') {
    // for strings we just keep them
  } else {
    shortValue = Object.keys(value).length;
  }

  return (
    <tr className="borderedTr" title={jsonPrinter(longValue)}>
      <td>{type}</td>
      <td>{shortValue}</td>
    </tr>
  );
};

const StatusTable = ({ status }) => (
  <table>
    <tbody>
      {
        Object
          .keys(status)
          .map(key => (<Row key={key} type={key} value={status[key]} />))
      }
    </tbody>
  </table>
);

export default class Overview extends React.Component {
  offers = createModuleWrapper('offers-v2');

  state = {
    now: 'loading'
  }

  loading = () => this.setState({
    now: 'loading'
  });

  fetchAndRender = async () => {
    const env = await this.offers.getFullOffersEnvironment();

    this.setState({
      status: env,
      details: jsonPrinter(env),
      country: env.countryOverride || env.country,
      city: env.cityOverride || env.city,
      language: env.languageOverride || env.language,
      triggerUrl: 'https://www.google.com/search?q=roastmarket',
      now: 'ready'
    });
  }

  async componentDidMount() {
    await this.fetchAndRender();

    // eslint-disable-next-line no-console
    console.log('overview state loaded', this.state);
  }

  handleClick = ({ target }) => {
    const details = target.title || target.parentElement.title;

    if (details) {
      this.setState({ details });
    }
  }

  onTriggerClick = async () => {
    this.loading();
    const triggerDetaisls = await this.offers.getCategoryForUrl(this.state.triggerUrl);
    this.setState({
      details: jsonPrinter(triggerDetaisls),
      now: 'ready'
    });
  }

  onCountryOverride = async () => {
    this.loading();
    await this.offers.setCountryOverride(this.state.country);
    await this.fetchAndRender();
  }

  onCountryOverrideReset = async () => {
    this.loading();
    await this.offers.resetCountryOverride();
    await this.fetchAndRender();
  }

  onCityOverride = async () => {
    this.loading();
    await this.offers.setCityOverride(this.state.city);
    await this.fetchAndRender();
  }

  onCityOverrideReset = async () => {
    this.loading();
    await this.offers.resetCityOverride();
    await this.fetchAndRender();
  }

  onLanguageOverride = async () => {
    this.loading();
    await this.offers.setLanguageOverride(this.state.language);
    await this.fetchAndRender();
  }

  onLanguageOverrideReset = async () => {
    this.loading();
    await this.offers.resetLanguageOverride();
    await this.fetchAndRender();
  }

  onBackendOverride = async () => {
    this.loading();
    await this.offers.setBackendOverride();
    await this.fetchAndRender();
  }

  onBackendOverrideReset = async () => {
    this.loading();
    await this.offers.resetBackendOverride();
    await this.fetchAndRender();
  }

  handleInputChange(e, field) {
    this.setState({
      [field]: e.target.value
    });
  }

  render() {
    // eslint-disable-next-line no-console
    console.log('rendering..', this.state);

    return (
      <React.Fragment>
        <Header>
          Offers environment overview
        </Header>
        <Main className={this.state?.now} onClick={this.handleClick}>
          <table>
            <tbody>
              <tr>
                <td>
                  <input
                    type="submit"
                    value="Trigger"
                    onClick={this.onTriggerClick}
                  />
                </td>
                <td>
                  <input
                    id="triggerInput"
                    type="text"
                    value={this.state?.triggerUrl || 'Loading ...'}
                    onChange={e => this.handleInputChange(e, 'triggerUrl')}
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <input
                    type="submit"
                    value="Change Country"
                    onClick={this.onCountryOverride}
                    style={{ width: '50%' }}
                  />
                  <input
                    type="submit"
                    value="Reset Country"
                    onClick={this.onCountryOverrideReset}
                    style={{ width: '50%' }}
                  />
                </td>
                <td>
                  <input
                    id="triggerInput"
                    type="text"
                    value={this.state?.country || 'Loading ...'}
                    onChange={e => this.handleInputChange(e, 'country')}
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <input
                    type="submit"
                    value="Change City"
                    onClick={this.onCityOverride}
                    style={{ width: '50%' }}
                  />
                  <input
                    type="submit"
                    value="Reset City"
                    onClick={this.onCityOverrideReset}
                    style={{ width: '50%' }}
                  />
                </td>
                <td>
                  <input
                    id="triggerInput"
                    type="text"
                    value={this.state?.city || 'Loading ...'}
                    onChange={e => this.handleInputChange(e, 'city')}
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <input
                    type="submit"
                    value="Change Language"
                    onClick={this.onLanguageOverride}
                    style={{ width: '50%' }}
                  />
                  <input
                    type="submit"
                    value="Reset Language"
                    onClick={this.onLanguageOverrideReset}
                    style={{ width: '50%' }}
                  />
                </td>
                <td>
                  <input
                    id="triggerInput"
                    type="text"
                    value={this.state?.language || 'Loading ...'}
                    onChange={e => this.handleInputChange(e, 'language')}
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <input
                    type="submit"
                    value="Staging Backend"
                    onClick={this.onBackendOverride}
                    style={{ width: '50%' }}
                  />
                  <input
                    type="submit"
                    value="Production Backend"
                    onClick={this.onBackendOverrideReset}
                    style={{ width: '50%' }}
                  />
                </td>
                <td>
                  <input
                    id="triggerInput"
                    type="text"
                    value={this.state?.status?.backendEnvironment || 'Loading ...'}
                  />
                </td>
              </tr>
              <tr height="100%">
                <td width="100px">
                  {this.state && this.state.status
                    ? <StatusTable status={this.state.status} />
                    : <div>Loading ...</div>
                  }
                </td>
                <td>
                  {this.state?.details
                    && <textarea value={this.state.details} readOnly />}
                </td>
              </tr>
            </tbody>
          </table>
        </Main>
      </React.Fragment>
    );
  }
}
