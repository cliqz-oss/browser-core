import React from 'react';
import PropTypes from 'prop-types';

import Button from './partials/button';
import RadioInput from './partials/radio-input';
import Row from './partials/row';
import TableHeader from './partials/table-header';
import TextInput from './partials/text-input';

const labels = [
  { name: 'production', address: 'https://api.cliqz.com' },
  { name: 'dev', address: 'https://ambassador-internal-eu-dev.clyqz.com' },
  { name: 'staging', address: 'https://ambassador-staging.clyqz.com' },
];
const initCustomEndpoint = 'https://custom.api.cliqz.com';

class SearchBackendConfig extends React.Component {
  constructor(props, ...args) {
    super(props, ...args);
    this.state = {
      customEndpoint: this.getCustomLocalStorageEndpoint() || initCustomEndpoint,
      endpointsUrl: '',
    };
  }

  componentDidMount() {
    this.syncState();
  }

  syncState = async () => {
    const newState = await this.props.cliqz.getEndpointsState();
    this.setState(newState);
  }

  onRadioUpdate = async (address) => {
    this.props.cliqz.setEndpoints({ address });
    this.syncState();
  }

  isRadioChecked = (label) => {
    const valueToCheck = label.name === 'custom'
      ? this.state.customEndpoint
      : label.address;
    return this.state.endpointsUrl.includes(valueToCheck);
  }

  setTextInputValue = (value) => {
    this.setState({
      customEndpoint: value,
    });
    this.isRadioChecked({ name: 'custom' });
  }

  resetToInitialState = () => {
    this.props.cliqz.setEndpoints({
      address: 'https://api.cliqz.com',
      reset: true,
    });
    this.resetCustomLocalStorageEndpoint();
    this.setState({
      customEndpoint: initCustomEndpoint,
    });
    this.syncState();
  }

  applyCustomEndpoint = () => {
    this.setCustomLocalStorageEndpoint(this.state.customEndpoint);
    this.props.cliqz.setEndpoints({ address: this.state.customEndpoint });
    this.syncState();
  }

  getCustomLocalStorageEndpoint = () => localStorage.getItem('CustomEndpoint')

  setCustomLocalStorageEndpoint = value =>
    localStorage.setItem('CustomEndpoint', value)

  resetCustomLocalStorageEndpoint = () => {
    localStorage.removeItem('CustomEndpoint');
  }

  render() {
    return (
      <table>
        <tbody>
          <TableHeader
            header={`Current endpoint host: ${this.state.endpointsUrl}`}
          />

          {labels.map(label =>
            (
              <Row key={label.name}>
                <label>
                  <RadioInput
                    isRadioChecked={this.isRadioChecked(label)}
                    onRadioUpdate={() => this.onRadioUpdate(label.address)}
                  />
                  {label.name}
                </label>
              </Row>
            ))}

          <Row idxOfChildToSpan={0}>
            <label>
              <RadioInput
                isRadioChecked={this.isRadioChecked({ name: 'custom' })}
                onRadioUpdate={() => this.onRadioUpdate(this.state.customEndpoint)}
              />
              custom (format: protocol + domain + port)
              <br />
              Default protocol: http
              <br />
              Domain: obligatory
              <br />
              Default port: none
            </label>
          </Row>

          <Row>
            <TextInput
              onTextChange={value => this.setTextInputValue(value)}
              textInputValue={this.state.customEndpoint}
            />

            <Button
              onClick={this.applyCustomEndpoint}
              value="APPLY CUSTOM VALUE"
            />
          </Row>

          <Row>
            <Button
              onClick={this.resetToInitialState}
              value="RESET TO INITIAL STATE"
            />
          </Row>
        </tbody>
      </table>
    );
  }
}

SearchBackendConfig.propTypes = {
  cliqz: PropTypes.object.isRequired,
};

export default SearchBackendConfig;
