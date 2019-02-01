import React from 'react';
import PropTypes from 'prop-types';

import Row from './partials/row';
import Switch from './partials/switch';

function AppModules({
  cliqz,
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

  const renderModuleList = () => modules.map(item =>
    (
      <Row key={item.name}>
        {`${item.name} (loading time: ${item.loadingTime})`}

        <Switch
          isChecked={item.isEnabled}
          toggleComponent={() =>
            moduleStateChangeAction(item.name, { isEnabled: !item.isEnabled })}
        />
      </Row>
    ));

  return (
    <table>
      <tbody>
        {renderModuleList()}
      </tbody>
    </table>
  );
}

AppModules.propTypes = {
  cliqz: PropTypes.object.isRequired,
  modules: PropTypes.array.isRequired,
  syncState: PropTypes.func.isRequired,
};

export default AppModules;
