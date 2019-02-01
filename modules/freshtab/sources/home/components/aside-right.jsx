import React from 'react';
import PropTypes from 'prop-types';

import AsideElement from './partials/aside-element';
// import Button from './partials/button';
import Settings from './settings';
import t from '../i18n';

function AsideRight({
  onBackgroundImageChanged,
  onDeveloperModulesOpen,
  onNewsSelectionChanged,
  restoreHistorySpeedDials,
  shouldShowSearchSwitch,
  state,
  state: {
    config,
  },
  toggleBackground,
  toggleBlueTheme,
  toggleComponent,
  toggleSettings,
}) {
  const shouldShowDeveloperModulesIcon = state.config.developer === true;

  return (
    <aside className="aside">
      <Settings
        blueTheme={config.blueTheme}
        componentsState={config.componentsState}
        hasHistorySpeedDialsToRestore={state.hasHistorySpeedDialsToRestore}
        isBlueThemeSupported={config.isBlueThemeSupported}
        isOpen={state.isSettingsOpen}
        isStatsSupported={config.isStatsSupported}
        onBackgroundImageChanged={onBackgroundImageChanged}
        onNewsSelectionChanged={onNewsSelectionChanged}
        restoreHistorySpeedDials={restoreHistorySpeedDials}
        shouldShowSearchSwitch={shouldShowSearchSwitch}
        toggle={toggleSettings}
        toggleBackground={toggleBackground}
        toggleBlueTheme={toggleBlueTheme}
        toggleComponent={toggleComponent}
        wallpapers={config.wallpapers}
      />

      <AsideElement
        condition={state.isSettingsOpen}
        id="settings-btn"
        isAndOperator={false}
        isButton
        label="Settings"
        onClick={toggleSettings}
        title={t('cliqz_tab_settings_button')}
      />

      <AsideElement
        condition={shouldShowDeveloperModulesIcon}
        id="cliqz-modules-btn"
        isButton
        label={t('cliqz_modules_button')}
        onClick={onDeveloperModulesOpen}
        title={t('cliqz_modules_button')}
      />
    </aside>
  );
}

AsideRight.propTypes = {
  onBackgroundImageChanged: PropTypes.func,
  onDeveloperModulesOpen: PropTypes.func,
  onNewsSelectionChanged: PropTypes.func,
  restoreHistorySpeedDials: PropTypes.func,
  shouldShowSearchSwitch: PropTypes.bool,
  state: PropTypes.shape({
    config: PropTypes.object,
  }),
  toggleBackground: PropTypes.func,
  toggleBlueTheme: PropTypes.func,
  toggleComponent: PropTypes.func,
  toggleSettings: PropTypes.func,
};

export default AsideRight;
