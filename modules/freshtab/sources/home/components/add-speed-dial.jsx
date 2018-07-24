/* eslint-disable jsx-a11y/no-autofocus */
import PropTypes from 'prop-types';
import React from 'react';
import ToggleDisplay from 'react-toggle-display';
import SpeedDialModal from './speed-dial-modal';
import cliqz from '../cliqz';
import t from '../i18n';
import { favoriteAddSignal, addFormCloseSignal, addFormSubmitSignal } from '../services/telemetry/speed-dial';

const DEFAULT_STATE = Object.freeze({
  show: true,
  showError: false,
  errorDuplicate: false,
  errorInvalid: false,
  showModal: false,
});

export default class AddSpeedDial extends React.Component {
  static get propTypes() {
    return {
      addSpeedDial: PropTypes.func,
    };
  }

  constructor(props) {
    super(props);
    this.freshtab = cliqz.freshtab;
    this.state = {
      ...DEFAULT_STATE,
      url: '',
      title: '',
    };

    this.baseState = this.state; // used later for resetting the form
    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
  }

  handleCloseModal() {
    this.setState({ showModal: false });
    this.setState(this.baseState);
    addFormCloseSignal();
  }

  handleClick(event) {
    event.preventDefault();
    this.setState({ showModal: true });
  }

  handleChange(event) {
    const value = event.target.value;
    const name = event.target.name;

    this.setState({
      [name]: value,
      showError: false,
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    const url = this.state.url;
    const title = this.state.title;
    addFormSubmitSignal();

    if (!url) {
      return false;
    }

    this.freshtab.addSpeedDial({ url, title }, null).then((resp) => {
      if (resp.error) {
        this.setState({ showError: true, showModal: true });
        if (resp.reason.indexOf('duplicate') > -1) {
          this.setState({
            errorDuplicate: true
          });
        } else {
          this.setState({
            errorInvalid: true
          });
        }
      } else {
        this.setState({
          url: '',
          title: '',
          showError: false,
        });

        favoriteAddSignal();
        this.props.addSpeedDial(resp);
        return this.handleCloseModal();
      }

      return false;
    });

    return false;
  }

  render() {
    let isEnabled = !(this.state.errorDuplicate || this.state.errorInvalid);
    const classes = ['submit'];
    const errorStr = this.state.errorDuplicate ? t('app_speed_dial_exists_already') :
      t('app_speed_dial_not_valid');

    if (!this.state.url) {
      isEnabled = false;
    }

    if (isEnabled === false) {
      classes.push('inactive');
    }

    return (
      <div className="dial dial-plus">
        <ToggleDisplay show={this.state.show}>
          <button
            className="plus-dial-icon"
            onClick={this.handleClick}
            tabIndex="-1"
          />
        </ToggleDisplay>
        <SpeedDialModal
          closeAction={this.handleCloseModal}
          showModal={this.state.showModal}
        >
          <form
            className="addDialForm"
            onSubmit={this.handleSubmit}
          >
            <div className="modal-header">{t('app_speed_dial_add_header')}
              <button
                className="closeForm"
                type="button"
                role="link"
                onClick={this.handleCloseModal}
              />
            </div>
            <div className="field">
              <input
                name="url"
                className="addUrl"
                id="url"
                type="text"
                value={this.state.url}
                onChange={this.handleChange}
                placeholder=""
                autoFocus={!this.state.showError}
              />
              {this.state.showError
                ? [
                  <label htmlFor="url" className="errorMessage">{errorStr}</label>,
                  <i className="errorIcon" />
                ]
                : <label htmlFor="url">{t('app_speed_dial_input_address_placeholder')}</label>
              }
            </div>
            <div className="field">
              <input
                name="title"
                className="title"
                id="title"
                type="text"
                value={this.state.title}
                onChange={this.handleChange}
                placeholder=""
              />
              <label htmlFor="title">{t('app_speed_dial_input_title_placeholder')}</label>
            </div>
            <button
              className="submit"
              type="submit"
              onClick={this.handleSubmit}
              disabled={!this.state.url ? 'disabled' : ''}
            >
              {t('app_speed_dial_add').toUpperCase()}
            </button>
          </form>
        </SpeedDialModal>
      </div>
    );
  }
}

