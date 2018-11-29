import PropTypes from 'prop-types';
import React from 'react';
import DeveloperModal from './modal';
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

const ModulesDeveloperModal = (props = {}) => {
  const error = props.error;
  const showModal = props.isOpen;

  return (
    <DeveloperModal
      closeAction={props.closeAction}
      showModal={showModal}
      className="toolbox-modal"
    >
      <div className="modules-developer-modal">
        <button
          type="button"
          className="closeForm"
          role="link"
          onClick={props.closeAction}
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
    </DeveloperModal>
  );
};

ModulesDeveloperModal.propTypes = {
  closeAction: PropTypes.func,
  isOpen: PropTypes.bool,
  error: PropTypes.string,
};

export default ModulesDeveloperModal;
