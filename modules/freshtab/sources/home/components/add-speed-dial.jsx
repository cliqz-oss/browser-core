/* eslint-disable react/no-unused-state */

import React from 'react';
import PropTypes from 'prop-types';

import cliqz from '../cliqz';
import sanitizeUrl from '../services/url-check';
import t from '../i18n';
import { favoriteAddSignal, addFormCloseSignal, addFormSubmitSignal } from '../services/telemetry/speed-dial';

import SpeedDialModal from './partials/speed-dial-modal';

export default class AddSpeedDial extends React.Component {
  state = {
    errorDuplicate: false,
    errorInvalid: false,
    show: true,
    showError: false,
    showModal: false,
    url: '',
    title: '',
  }

  freshtab = cliqz.freshtab;

  baseState = this.state; // used later for resetting the form

  handleCloseModal = ({ sendTelemetry = true } = {}) => {
    this.props.updateModalState(false);
    this.setState({ showModal: false });
    this.setState(this.baseState);
    if (sendTelemetry) {
      addFormCloseSignal();
    }
  }

  handleClick = (event) => {
    event.preventDefault();
    favoriteAddSignal();
    this.props.updateModalState(true);
    this.setState({ showModal: true });
  }

  handleChange = (event) => {
    const value = event.target.value;
    const name = event.target.name;

    this.setState({
      [name]: value,
      showError: false,
    });
  }

  handleSubmit = (event) => {
    event.preventDefault();
    const url = sanitizeUrl(this.state.url);
    const title = this.state.title;

    if (!url) {
      this.props.updateModalState(true);
      this.setState({
        errorInvalid: true,
        showError: true,
        showModal: true
      });

      return false;
    }

    this.freshtab.addSpeedDial({ url, title }, null).then((resp) => {
      if (resp.error) {
        this.props.updateModalState(true);
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

        addFormSubmitSignal();
        this.props.addSpeedDial(resp);
        return this.handleCloseModal({ sendTelemetry: false });
      }

      return false;
    });

    return false;
  }

  render() {
    let isEnabled = !(this.state.errorDuplicate || this.state.errorInvalid);
    const classes = ['submit'];

    if (!this.state.url) {
      isEnabled = false;
    }

    if (isEnabled === false) {
      classes.push('inactive');
    }

    return (
      <SpeedDialModal
        buttonClass="plus-dial-icon"
        buttonOnClick={this.handleClick}
        fieldLabel={t('app_speed_dial_input_address_placeholder')}
        formClass="addDialForm"
        formOnSubmit={this.handleSubmit}
        handleCloseModal={this.handleCloseModal}
        handleFieldChange={this.handleChange}
        mainElementClass="dial dial-plus"
        modalHeader={t('app_speed_dial_add_header')}
        state={this.state}
        submitLabel={t('app_speed_dial_add').toUpperCase()}
        titleLabel={t('app_speed_dial_input_title_placeholder')}
        urlClass="addUrl"
        urlLabel={t('app_speed_dial_input_address_placeholder')}
      />
    );
  }
}

AddSpeedDial.propTypes = {
  addSpeedDial: PropTypes.func,
};
