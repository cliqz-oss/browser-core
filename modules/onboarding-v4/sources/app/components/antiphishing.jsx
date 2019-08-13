import React from 'react';
import Info from './info';
import t from '../../i18n';

export default function Antiphishing({
  onToggle,
  stepState,
  visible,
}) {
  function getClassName() {
    const className = visible ? 'show' : '';
    return stepState.enabled ? `${className} toggled` : className;
  }

  function getDescription() {
    return stepState.enabled
      ? t('antiphishing_toggle_on')
      : t('antiphishing_toggle_off');
  }

  function getHeadline() {
    return stepState.enabled
      ? t('antiphishing_headline_on')
      : t('antiphishing_headline');
  }

  return (
    <div className={`step antiphishing ${getClassName()}`}>
      {visible && (
        <React.Fragment>
          <Info
            description={getDescription()}
            headline={getHeadline()}
            isToggled={stepState.enabled}
            onToggle={onToggle}
          />

          <div className={`antiphishing-background ${stepState.enabled ? 'toggled' : ''}`} />
          <div className={`antiphishing-footer-before ${stepState.enabled ? 'toggled' : ''}`} />
          <div className={`antiphishing-footer-after ${stepState.enabled ? 'toggled' : ''}`} />
        </React.Fragment>
      )}
    </div>
  );
}
