/* eslint-disable react/prefer-stateless-function */

import React from 'react';
import PropTypes from 'prop-types';
import ToggleDisplay from 'react-toggle-display';

import Button from './button';
import Modal from '../modal';
import SubmitButton from './submit-button';
import TextInput from './text-input';
import t from '../../i18n';

export default function SpeedDialModal({
  buttonClass,
  buttonOnClick,
  buttonTitle,
  formClass,
  formInputClass,
  formOnSubmit,
  handleCloseModal,
  handleDeleteClick,
  handleDeleteKeyPress,
  handleFieldChange,
  isEdit,
  isFieldDisabled,
  mainElementClass,
  mainElementOnClick,
  modalHeader,
  state,
  submitLabel,
  titleLabel,
  urlClass,
  urlLabel,
}) {
  const errorStr = state.errorDuplicate
    ? t('app_speed_dial_exists_already')
    : t('app_speed_dial_not_valid');

  return (
    <div
      className={mainElementClass}
      onClick={mainElementOnClick}
      role="presentation"
    >
      <ToggleDisplay show={state.show}>
        <Button
          className={buttonClass}
          onClick={buttonOnClick}
          title={buttonTitle}
        />
      </ToggleDisplay>
      <Modal
        className="modal"
        closeAction={handleCloseModal}
        showModal={state.showModal}
      >
        <form
          className={formClass}
          onSubmit={formOnSubmit}
        >
          <Button
            className="closeForm"
            onClick={handleCloseModal}
          />
          <div className="modal-header">
            {modalHeader}
          </div>
          <div>
            <TextInput
              autoFocus={!state.showError}
              className={urlClass}
              disabled={isFieldDisabled}
              id="url"
              labelClassName={state.showError
                ? 'errorMessage'
                : ''}
              labelValue={state.showError
                ? errorStr
                : urlLabel}
              name="url"
              onChange={handleFieldChange}
              placeholder=""
              value={state.url}
            />
            {state.showError && <i className="errorIcon" />}

            <div className={formInputClass || 'field'}>
              <TextInput
                className="title"
                id="title"
                labelValue={titleLabel}
                name="title"
                onChange={handleFieldChange}
                placeholder=""
                type="text"
                value={state.title}
              />
            </div>

            <div className="aligner">
              <SubmitButton
                className="submit"
                disabled={!state.url ? 'disabled' : ''}
                label={submitLabel}
              />
              {isEdit
                && (
                  <Button
                    className="deleteDial"
                    label={t('app_speed_dial_delete')}
                    onClick={handleDeleteClick}
                    onKeyPress={handleDeleteKeyPress}
                  />
                )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

SpeedDialModal.propTypes = {
  buttonClass: PropTypes.string,
  buttonOnClick: PropTypes.func,
  buttonTitle: PropTypes.string,
  formClass: PropTypes.string,
  formInputClass: PropTypes.string,
  formOnSubmit: PropTypes.func,
  handleCloseModal: PropTypes.func,
  handleDeleteClick: PropTypes.func,
  handleDeleteKeyPress: PropTypes.func,
  handleFieldChange: PropTypes.func,
  isEdit: PropTypes.bool,
  isFieldDisabled: PropTypes.bool,
  mainElementClass: PropTypes.string,
  mainElementOnClick: PropTypes.func,
  modalHeader: PropTypes.string,
  state: PropTypes.object,
  submitLabel: PropTypes.string,
  titleLabel: PropTypes.string,
  urlClass: PropTypes.string,
  urlLabel: PropTypes.string,
};

SpeedDialModal.defaultProps = {
  buttonClass: '',
  buttonOnClick: () => {},
  buttonTitle: '',
  formInputClass: '',
  isEdit: false,
  mainElementClass: '',
  mainElementOnClick: () => {},
};
