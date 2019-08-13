import React from 'react';
import t from '../../i18n';

export default function PopupConfirmation({
  className,
  onActionBtnClick,
  onSkipBtnClick,
  onCloseBtnClick,
  onHideClick,
}) {
  function getHeadline() {
    return t(`${className}_headline`);
  }

  function getDescription() {
    return t(`${className}_description`);
  }

  function getActionButtonText() {
    return t(`${className}_action_button`);
  }

  function getSkipButtonText() {
    return t(`${className}_skip_button`);
  }

  return (
    <div
      className={`popup-confirmation ${className}`}
    >
      <div
        className="popup-confirmation-overlay"
        onClick={onHideClick}
        role="button"
        tabIndex="0"
      />
      <div className="popup-confirmation-container">
        <div className="headline">{getHeadline()}</div>
        <div className="description">{getDescription()}</div>

        <div className="buttons-wrapper">
          <button
            type="button"
            className="action"
            onClick={onActionBtnClick}
          >
            {getActionButtonText()}
          </button>
          <button
            type="button"
            className="skip"
            onClick={onSkipBtnClick}
          >
            {getSkipButtonText()}
          </button>
        </div>
        <button
          className="close"
          onClick={onCloseBtnClick}
          type="button"
        />
      </div>
    </div>
  );
}
