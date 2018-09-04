import PropTypes from 'prop-types';
import React from 'react';
import DeveloperModal from './modal';
import t from '../i18n';
import Switch from './switch';

function renderModules(modules, moduleStateChangeAction) {
  return modules.map(item =>
    (
      <div key={item.name} className="modal-body-item">
        <span className="input-checkbox-title">
          { item.name } (loading time: { item.loadingTime })
        </span>
        <Switch
          toggleComponent={() => moduleStateChangeAction(item.name, { isEnabled: !item.isEnabled })}
          name={item.name}
          isChecked={item.isEnabled}
        />
      </div>
    )
  );
}

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
  const modules = props.modules || [];

  return (
    <DeveloperModal
      closeAction={props.closeAction}
      showModal={showModal}
    >
      <form className="modulesDeveloperModal">
        <div className="modal-header">
          {t('cliqz_modules_list')}
          <button
            type="button"
            className="closeForm"
            role="link"
            onClick={props.closeAction}
          />
        </div>

        <div className="modal-body-outer">
          <div className="modal-body-inner">
            {error
              ? renderError(error)
              : renderModules(modules, props.moduleStateChangeAction)
            }
          </div>
        </div>
      </form>
    </DeveloperModal>
  );
};

ModulesDeveloperModal.propTypes = {
  closeAction: PropTypes.func,
  isOpen: PropTypes.bool,
  error: PropTypes.string,
  moduleStateChangeAction: PropTypes.func,
};

export default ModulesDeveloperModal;
