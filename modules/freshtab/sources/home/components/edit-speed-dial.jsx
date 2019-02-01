/* eslint-disable react/no-unused-state */

import React from 'react';
import PropTypes from 'prop-types';

import cliqz from '../cliqz';
import sanitizeUrl from '../services/url-check';
import t from '../i18n';
import { favoriteEditSignal, editFormCloseSignal, editFormSubmitSignal } from '../services/telemetry/speed-dial';

import SpeedDialModal from './partials/speed-dial-modal';

export default class EditSpeedDial extends React.Component {
  state = {
    errorDuplicate: false,
    show: true,
    showError: false,
    showModal: false,
    url: this.props.dial.url,
    title: this.props.dial.displayTitle,
  }

  freshtab = cliqz.freshtab;

  baseState = this.state; // used later for resetting the form

  editSpeedDialModal = (event) => {
    event.preventDefault();
    event.stopPropagation();
    this.props.updateModalState(true);
    this.setState({ showModal: true });
  }

  handleEditChange = (event) => {
    const value = event.target.value;
    const name = event.target.name;

    this.setState({
      [name]: value,
      showError: false,
    });
  }

  handleEditSubmit = (ev) => {
    ev.preventDefault();
    const url = sanitizeUrl(this.state.url);
    const title = this.state.title;

    if (!url) {
      this.props.updateModalState(true);
      this.setState({
        showError: true,
        showModal: true
      });
      return false;
    }

    this.freshtab.editSpeedDial(this.props.dial, { url, title }).then((resp) => {
      if (resp.error) {
        this.props.updateModalState(true);
        this.setState({ showError: true, showModal: true });
        if (resp.reason.indexOf('duplicate') > -1) {
          this.setState({
            errorDuplicate: true,
          });
        }
      } else {
        this.props.updateModalState(false);
        this.setState({
          showModal: false
        });
        editFormSubmitSignal();
        this.props.updateDial(resp);
      }
    });

    return true;
  }

  handleRemoveKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.handleRemove(e);
    }
  };

  handleRemove = (event) => {
    event.preventDefault();
    event.stopPropagation();
    this.props.updateModalState(false);
    this.setState({ showModal: false });
    this.props.removeDial(this.props.dial);
  }

  handleCloseEditModal = (event) => {
    event.preventDefault();
    event.stopPropagation();
    editFormCloseSignal();
    this.setState(this.baseState);
  }

  render() {
    const inputClasses = ['field'];
    let inputClass = '';

    if (!this.props.dial.custom) {
      inputClasses.push('disabled');
    }

    inputClass = inputClasses.join(' ');

    return (
      // adding stop event propagation here because edit-speed-dial is inside the speed dial <a> tag
      // change structure of code for edit-speed-dial to be independent
      <SpeedDialModal
        buttonClass="edit"
        buttonOnClick={(e) => { favoriteEditSignal(); this.editSpeedDialModal(e); }}
        buttonTitle="Edit"
        formClass="editForm"
        formInputClass={inputClass}
        formOnSubmit={e => this.handleEditSubmit(e)}
        handleCloseModal={e => this.handleCloseEditModal(e)}
        handleDeleteClick={e => this.handleRemove(e)}
        handleDeleteKeyPress={e => this.handleRemoveKeyPress(e)}
        handleFieldChange={this.handleEditChange}
        isEdit
        isFieldDisabled={!this.props.dial.custom}
        mainElementOnClick={e => e.stopPropagation()}
        modalHeader={t('app_speed_dial_edit_header')}
        state={this.state}
        submitLabel={t('app_speed_dial_save').toUpperCase()}
        titleLabel={t('app_speed_dial_edit_title_header')}
        urlClass="url"
        urlLabel={t('app_speed_dial_edit_address_header')}
      />
    );
  }
}

EditSpeedDial.propTypes = {
  dial: PropTypes.shape({
    displayTitle: PropTypes.string,
    url: PropTypes.string,
  }),
  removeDial: PropTypes.func,
  updateDial: PropTypes.func,
  updateModalState: PropTypes.func,
};
