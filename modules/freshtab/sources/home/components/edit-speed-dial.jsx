/* eslint-disable jsx-a11y/no-autofocus */
import React from 'react';
import SpeedDialModal from './speed-dial-modal';
import cliqz from '../cliqz';
import t from '../i18n';
import { favoriteAddSignal, addFormCloseSignal, addFormSubmitSignal } from '../services/telemetry/speed-dial';

export default class EditSpeedDial extends React.Component {
  constructor(props) {
    super(props);
    this.freshtab = cliqz.freshtab;
    this.state = {
      show: true,
      errorDuplicate: false,
      errorInvalid: false,
      showError: false,
      showModal: false,
      submitDisabled: false,
      url: this.props.dial.url,
      title: this.props.dial.displayTitle,
    };

    this.baseState = this.state; // used later for resetting the form
    this.handleEditChange = this.handleEditChange.bind(this);
    this.handleEditSubmit = this.handleEditSubmit.bind(this);
  }

  editSpeedDialModal(event) {
    event.preventDefault();
    event.stopPropagation();
    this.setState({ showModal: true });
  }

  handleEditChange(event) {
    const value = event.target.value;
    const name = event.target.name;

    this.setState({
      [name]: value,
      showError: false,
    });
  }

  handleEditSubmit() {
    const url = this.state.url;
    const title = this.state.title;
    if (!url) {
      return false;
    }

    this.freshtab.editSpeedDial(this.props.dial, { url, title }).then((resp) => {
      if (resp.error) {
        if (resp.reason.indexOf('duplicate') > -1) {
          this.setState({
            errorDuplicate: true,
            showError: true,
          });
        } else {
          this.setState({
            errorInvalid: true,
            showError: true,
          });
        }
      } else {
        this.props.updateDial(resp);
        this.setState({
          showModal: false
        });
        favoriteAddSignal();
        addFormSubmitSignal();
      }
    });

    return true;
  }

  handleRemove(event) {
    event.preventDefault();
    event.stopPropagation();
    this.setState({ showModal: false });
    this.props.removeDial(this.props.dial);
  }

  handleCloseEditModal(event) {
    event.preventDefault();
    event.stopPropagation();
    this.setState(this.baseState);
    addFormCloseSignal();
  }

  render() {
    const inputClasses = ['field'];
    let inputClass = '';
    const errorStr = this.state.errorDuplicate ? t('app_speed_dial_exists_already') :
      t('app.speed_dial_not_valid');

    if (!this.props.dial.custom) {
      inputClasses.push('disabled');
    }

    inputClass = inputClasses.join(' ');

    return (
      <button
        className="edit"
        title="Edit"
        onClick={e => this.editSpeedDialModal(e)}
      >
        <SpeedDialModal
          closeAction={e => this.handleCloseEditModal(e)}
          showModal={this.state.showModal}
        >
          <form
            className="editForm"
            onSubmit={(event) => { event.preventDefault(); this.handleEditSubmit(); }}
          >
            <div className="modal-header">{t('app_speed_dial_edit_header')}
              <button
                className="closeForm"
                onClick={e => this.handleCloseEditModal(e)}
              />
            </div>
            <div className={inputClass}>
              <input
                name="url"
                className="url"
                autoFocus={!this.state.showError}
                type="text"
                disabled={!this.props.dial.custom}
                value={this.state.url}
                onChange={this.handleEditChange}
                placeholder=""
              />
              {this.state.showError ?
                [
                  <label htmlFor="url" className="errorMessage">{errorStr}</label>,
                  <i className="errorIcon" />
                ]
                :
                <label htmlFor="url">{t('app_speed_dial_edit_address_header')}</label>
              }
            </div>
            <div className="field">
              <input
                name="title"
                className="title"
                id="title"
                type="text"
                value={this.state.title}
                onChange={this.handleEditChange}
                placeholder=""
              />
              <label htmlFor="title">{t('app_speed_dial_edit_title_header')}</label>
            </div>
            <button
              className="submit"
              type="submit"
              onClick={this.handleEditSubmit}
              disabled={!this.state.url ? 'disabled' : ''}
            >
              {t('app_speed_dial_save').toUpperCase()}
            </button>
            <div
              role="presentation"
              className="deleteBox"
              onClick={e => this.handleRemove(e)}
            >
              <button className="deleteDial" />
              <span>{t('app_speed_dial_delete')}</span>
            </div>
          </form>
        </SpeedDialModal>
      </button>
    );
  }
}

