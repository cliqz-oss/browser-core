import React from 'react';
import t from '../../i18n';

export default class Final extends React.Component {
  componentDidUpdate() {
    if (this.props.visible) {
      window.removeEventListener('blur', this.props.showSkipPopup);
      this.updatePrefs();
      setTimeout(this.props.updateStep, 1100);
    }
  }

  get headline() {
    return this.allToggled
      ? t('protection_full_headline')
      : t('protection_partial_headline');
  }

  get allToggled() {
    return this.props.stepsState.filter(step => step.enabled === true).length === 3;
  }

  updatePrefs = () => {
    const prefs = [];
    this.props.stepsState.forEach(async (step) => {
      if (step.name === 'antiphishing') {
        prefs.push({ name: 'cliqz-anti-phishing-enabled', value: step.enabled });
      }
      if (step.name === 'adblocking') {
        prefs.push({ name: 'cliqz-adb', value: step.enabled });
      }
      if (step.name === 'antitracking') {
        prefs.push({ name: 'modules.antitracking.enabled', value: step.enabled });
      }
      await this.props.cliqz.setPrefs(prefs);
    });
  }

  render() {
    return (
      <div
        className={`step final ${this.props.visible ? 'show' : ''}`}
      >
        <div className="info">
          <div className="headline">
            {this.headline}
          </div>
          <div className="check" />
        </div>
      </div>
    );
  }
}
