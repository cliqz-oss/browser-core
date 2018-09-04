/* eslint-disable jsx-a11y/no-autofocus */
import React from 'react';
import ToggleDisplay from 'react-toggle-display';
import sanitizeUrl from '../services/url-check';
import Modal from './modal';
import cliqz from '../cliqz';
import t from '../i18n';
import { favoriteEditSignal, editFormCloseSignal, editFormSubmitSignal }
  from '../services/telemetry/speed-dial';

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
  }

  editSpeedDialModal = (event) => {
    event.preventDefault();
    event.stopPropagation();
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
      this.setState({
        errorInvalid: true,
        showError: true,
        showModal: true
      });
      return false;
    }

    this.freshtab.editSpeedDial(this.props.dial, { url, title }).then((resp) => {
      if (resp.error) {
        this.setState({ showError: true, showModal: true });
        if (resp.reason.indexOf('duplicate') > -1) {
          this.setState({
            errorDuplicate: true,
          });
        } else {
          this.setState({
            errorInvalid: true,
          });
        }
      } else {
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
    const errorStr = this.state.errorDuplicate ? t('app_speed_dial_exists_already') :
      t('app_speed_dial_not_valid');

    if (!this.props.dial.custom) {
      inputClasses.push('disabled');
    }

    inputClass = inputClasses.join(' ');

    return (
      // adding stop event propagation here because edit-speed-dial is inside the speed dial <a> tag
      // change structure of code for edit-speed-dial to be independent
      /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
      <div role="presentation" onClick={e => e.stopPropagation()}>
        <ToggleDisplay show={this.state.show}>
          <button
            className="edit"
            title="Edit"
            onClick={(e) => { favoriteEditSignal(); this.editSpeedDialModal(e); }}
          />
        </ToggleDisplay>
        <Modal
          closeAction={e => this.handleCloseEditModal(e)}
          showModal={this.state.showModal}
        >
          <form
            className="editForm"
            onSubmit={e => this.handleEditSubmit(e)}
          >
            <div className="modal-header">{t('app_speed_dial_edit_header')}
              <button
                className="closeForm"
                type="button"
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
            <div className="aligner">
              <button
                className="submit"
                type="submit"
                disabled={!this.state.url ? 'disabled' : ''}
              >
                {t('app_speed_dial_save').toUpperCase()}
              </button>
              <button
                className="deleteDial"
                onKeyPress={e => this.handleRemoveKeyPress(e)}
                onClick={e => this.handleRemove(e)}
              >
                {t('app_speed_dial_delete')}
              </button>
            </div>
          </form>
        </Modal>
      </div>
      /* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
    );
  }
}

