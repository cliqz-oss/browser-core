import React from 'react';
import PropTypes from 'prop-types';
import Switch from './switch';

function ModulesList({
  cliqz,
  modalClass,
  modules,
  syncState,
}) {
  const moduleStateChangeAction = async (moduleId, { isEnabled }) => {
    if (isEnabled) {
      await cliqz.enableModule(moduleId);
    } else {
      cliqz.disableModule(moduleId);
    }
    await syncState();
  };

  return (
    <div className={`modal-item ${modalClass}`}>
      <div className="modal-header">
        Cliqz modules list
      </div>

      <table>
        {modules.map(item =>
          (
            <tr key={item.name}>
              <td>
                {`${item.name} (loading time: ${item.loadingTime})`}
              </td>

              <td>
                <Switch
                  toggleComponent={() =>
                    moduleStateChangeAction(item.name, { isEnabled: !item.isEnabled })}
                  name={item.name}
                  isChecked={item.isEnabled}
                />
              </td>
            </tr>
          ))}
      </table>
    </div>
  );
}

ModulesList.propTypes = {
  cliqz: PropTypes.object.isRequired,
  modules: PropTypes.object.isRequired,
  syncState: PropTypes.func.isRequired,
  modalClass: PropTypes.string.isRequired,
};

export default ModulesList;
