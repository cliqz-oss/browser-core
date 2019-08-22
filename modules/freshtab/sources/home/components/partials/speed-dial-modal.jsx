/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/prefer-stateless-function */

import React from 'react';
import PropTypes from 'prop-types';

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
      {state.show
        && (
          <Button
            className={buttonClass}
            onClick={buttonOnClick}
            title={buttonTitle}
          />
        )
      }

      <Modal
        className="modal"
        closeAction={handleCloseModal}
        showModal={state.showModal}
      >
        <form
          className={`modal-form ${formClass}`}
          onSubmit={formOnSubmit}
        >
          <Button
            className="close-form"
            onClick={handleCloseModal}
          />
          <div className="modal-header">
            {modalHeader}
          </div>
          <div>
            <TextInput
              autoFocus={!state.showError}
              className={`modal-input ${urlClass}`}
              disabled={isFieldDisabled}
              id="url"
              labelClassName={state.showError
                ? 'input-label error-message'
                : 'input-label'}
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
                className="modal-input title"
                id="title"
                labelClassName="input-label"
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
