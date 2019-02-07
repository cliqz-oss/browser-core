import PropTypes from 'prop-types';
import React from 'react';
import Modal from './modal';
import Button from './partials/button';
import t from '../i18n';

function renderError(errorMessage = '') {
  return (
    <div className="errorMessage">
      <p>
        {t('cliqz_modules_loading_error')}
      </p>
      <p>
        { errorMessage }
      </p>
    </div>
  );
}

const ModulesDeveloperModal = ({
  closeAction,
  error,
  isOpen,
}) => (
  <Modal
    className="toolbox-modal"
    closeAction={closeAction}
    showModal={isOpen}
  >
    <div className="modules-developer-modal">
      <Button
        className="closeForm"
        onClick={closeAction}
      />

      {error
        ? renderError(error)
        : (
          <iframe
            tabIndex="-1"
            src="../toolbox/index.html"
            title="Module list"
          />
        )
      }
    </div>
  </Modal>
);

ModulesDeveloperModal.propTypes = {
  closeAction: PropTypes.func,
  error: PropTypes.string,
  isOpen: PropTypes.bool,
};

export default ModulesDeveloperModal;
