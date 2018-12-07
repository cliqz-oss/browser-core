import React from 'react';
import PropTypes from 'prop-types';
import Endpoint from './endpoint';
import Custom from './custom';

const labels = [
  { name: 'production', address: 'https://api.cliqz.com' },
  { name: 'dev', address: 'https://ambassador-internal-eu-dev.clyqz.com' },
  { name: 'staging', address: 'https://ambassador-staging.clyqz.com' },
];
const initCustomEndpoint = 'https://custom.api.cliqz.com';

class EndpointsList extends React.Component {
  constructor(props, ...args) {
    super(props, ...args);
    this.state = {
      endpointsUrl: props.endpointsUrl,
      customEndpoint: this.getCustomLocalStorageEndpoint() || initCustomEndpoint,
    };
  }

  onRadioUpdate = async (address) => {
    this.props.cliqz.setEndpoints(address);
    this.setState({
      endpointsUrl: address,
    });
  }

  isRadioChecked = (label) => {
    const valueToCheck = label.name === 'custom'
      ? this.state.customEndpoint
      : label.address;
    return this.state.endpointsUrl.includes(valueToCheck);
  }

  setTextInputValue = (address) => {
    this.setState({
      endpointsUrl: address,
      customEndpoint: address,
    });
    this.isRadioChecked({ name: 'custom' });
    this.setCustomLocalStorageEndpoint(address);
    this.props.cliqz.setEndpoints(address);
  }

  resetToInitialState = () => {
    const a = 'https://api.cliqz.com';
    this.props.cliqz.setEndpoints(a);
    this.resetCustomLocalStorageEndpoint();
    this.setState({
      endpointsUrl: a,
      customEndpoint: initCustomEndpoint,
    });
  }

  getCustomLocalStorageEndpoint = () => localStorage.getItem('CustomEndpoint')

  setCustomLocalStorageEndpoint = value =>
    localStorage.setItem('CustomEndpoint', value)

  resetCustomLocalStorageEndpoint = () => {
    localStorage.removeItem('CustomEndpoint');
  }

  render() {
    return (
      <div className={`modal-item ${this.props.modalClass}`}>
        <div className="modal-header">
          Change endpoints
        </div>

        <div>
          <p>{`Current endpoint: ${this.state.endpointsUrl}`}</p>
        </div>

        <table>
          {labels.map(label =>
            (
              <tr>
                <Endpoint
                  key={label.name}
                  label={label}
                  isRadioChecked={this.isRadioChecked(label)}
                  onRadioUpdate={() => this.onRadioUpdate(label.address)}
                />
              </tr>
            ))}

          <Custom
            isRadioChecked={this.isRadioChecked({ name: 'custom' })}
            onRadioUpdate={val => this.onRadioUpdate(val)}
            onTextChange={value => this.setTextInputValue(value)}
            textInputValue={this.state.customEndpoint}
          />

          <tr>
            <td colSpan="2">
              <input
                className="endpoints-button"
                type="button"
                value="RESET TO INITIAL STATE"
                onClick={() => this.resetToInitialState()}
              />
            </td>
          </tr>
        </table>
      </div>
    );
  }
}

EndpointsList.propTypes = {
  cliqz: PropTypes.func.isRequired,
  modalClass: PropTypes.string.isRequired,
};

export default EndpointsList;
