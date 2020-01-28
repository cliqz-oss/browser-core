/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import createModuleWrapper from '../../../core/helpers/action-module-wrapper';
import cliqz from '../../cliqz';
import tabs from '../../../platform/tabs';

import Layout from './layout';

import PopupConfirmation from './popup-confirmation';
import PopupControlCenter from './popup-control-center';

import * as telemetry from '../services/telemetry/telemetry';

export default class App extends React.Component {
  state = {
    currentStep: 0,
    steps: [
      {
        name: 'welcome',
        visited: true,
      },
      {
        name: 'antitracking',
        visited: false,
        enabled: false,
      },
      {
        name: 'adblocking',
        visited: false,
        enabled: false,
      },
      {
        name: 'antiphishing',
        visited: false,
        enabled: false,
      },
      {
        name: 'import-data',
        visited: false,
        enabled: false,
      },
      {
        name: 'final',
      }
    ],
    popupSkip: false,
    popupProtection: false,
  }

  updateStep = (index, obj) => {
    this.setState((prevState) => {
      const newSteps = prevState.steps.map((step, idx) => {
        if (idx === index) {
          return {
            ...step,
            ...obj,
          };
        }
        return step;
      });
      return {
        steps: newSteps,
      };
    }, () => {
      telemetry.showStep(this.view);
    });
  }

  addOnTabChangedListener = () => {
    tabs.getCurrent((tab) => { this.onboardingId = tab.id; });
    tabs.onActivated.addListener(this.handleTabChange);
  }

  removeOnTabChangedListener = () => {
    tabs.onActivated.removeListener(this.handleTabChange);
  }

  handleTabChange = (activeInfo) => {
    tabs.get(activeInfo.tabId, (tab) => {
      // don't show skip popup if active tab is onboarding page
      if (tab.id && tab.id === this.onboardingId) {
        return;
      }

      // don't show skip popup if active tab is 'about antitracking' page
      if (tab.url && tab.url === 'https://cliqz.com/whycliqz/anti-tracking') {
        return;
      }
      this.showSkipPopup();
    });
  }

  componentDidMount() {
    this.background = createModuleWrapper('onboarding-v4');
    cliqz.onboarding.setOnboardingAsShown();

    const beforeUnloadListener = () => {
      this.removeOnTabChangedListener();
      window.removeEventListener('beforeunload', beforeUnloadListener);
    };

    window.addEventListener('beforeunload', beforeUnloadListener);

    this.addOnTabChangedListener();
  }

  get view() {
    const index = this.state.currentStep;
    const name = this.state.steps[index].name;
    // We need to collect status from
    // antiphishing, antitracking and adblocking only;
    // For other modals we just return their name;
    if (name !== 'adblocking' && name !== 'antitracking' && name !== 'antiphishing') {
      return name;
    }
    const status = this.state.steps[index].enabled ? 'on' : 'off';
    return `${name}_${status}`;
  }

  onToggle = () => {
    const index = this.state.currentStep;
    telemetry.onToggle(this.view);
    this.updateStep(index, { enabled: !this.state.steps[index].enabled });
  }

  handleImportBtnClicked = () => {
    telemetry.importData();
    cliqz.onboarding.openImportDialog();
  }

  handleInfoNavigationClick = (event) => {
    const target = event.target;
    if (target.nodeName.toLowerCase() !== 'button') {
      return;
    }

    let index = target.getAttribute('data-index');
    if (index === 'next') {
      index = this.state.currentStep + 1;
      this.handleNextBtnClicked();
    } else {
      this.handleDotsComponentClicked(index * 1);
    }
  }

  handleDotsComponentClicked = (index) => {
    telemetry.dotsClick(this.view, index);
    this.setState({
      currentStep: index,
    }, () => { telemetry.showStep(this.view); });
  }

  handleNextBtnClicked = () => {
    telemetry.nextBtnClick(this.view);

    if (this.state.currentStep < 4) {
      this.setState(prevState => ({ currentStep: prevState.currentStep + 1 }),
        () => this.updateStep(this.state.currentStep, { visited: true }));
    } else if (this.state.steps.filter(step => step.enabled === true).length < 2) {
      telemetry.popupProtectionShow();
      this.setState({ popupProtection: true });
    } else {
      this.setState(prevState => ({ currentStep: prevState.currentStep + 1 }));
    }
  }

  // skip button

  handleSkipBtnClicked = () => {
    telemetry.skipBtnClick(this.view);
    this.showSkipPopup();
  }

  // popup skip functionality

  showSkipPopup = () => {
    // do not show the skip notification if protection warning is shown
    if (this.state.popupProtection) {
      return;
    }
    telemetry.popupSkipShow();
    this.setState({ popupSkip: true });
  }

  hideSkipPopup = () => {
    telemetry.popupSkipHide();
    this.setState({ popupSkip: false });
  }

  skipOnContinueClick = () => {
    telemetry.popupSkipContinue();
    this.hideSkipPopup();
  }

  skipOnSkipClick = () => {
    telemetry.popupSkipSkip();
    telemetry.popupSkipHide();
    this.setState(prevState => (
      {
        steps: prevState.steps.map((step, ind) => {
          if (ind < 4) {
            return (
              {
                ...step,
                enabled: true,
              }
            );
          }
          return step;
        }),
        currentStep: 5,
        popupSkip: false,
      }
    ));
  }

  skipOnCloseClick = () => {
    telemetry.popupSkipClose();
    this.hideSkipPopup();
  }

  skipOnHideClick = () => {
    this.hideSkipPopup();
  }

  // popup protection functionality

  hideProtectionPopup = () => {
    telemetry.popupProtectionHide();
    this.setState({ popupProtection: false });
  }

  protectionOnActivateClick = () => {
    telemetry.popupProtectionActivate();
    telemetry.popupProtectionHide();
    this.setState(prevState => (
      {
        steps: prevState.steps.map((step, ind) => {
          if (ind < 4) {
            return (
              {
                ...step,
                enabled: true,
              }
            );
          }
          return step;
        }),
        currentStep: prevState.currentStep + 1,
        popupProtection: false,
      }
    ));
  }

  protectionOnProceedClick = () => {
    telemetry.popupProtectionProceed();
    telemetry.popupProtectionHide();
    this.setState(prevState => (
      {
        currentStep: prevState.currentStep + 1,
        popupProtection: false,
      }
    ));
  }

  protectionOnCloseClick = () => {
    telemetry.popupProtectionClose();
    this.hideProtectionPopup();
  }

  protectionOnHideClick = () => {
    this.hideProtectionPopup();
  }

  finalComponentDidUpdate = () => {
    this.removeOnTabChangedListener();
    this.updatePrefs();

    setTimeout(() => {
      this.setState(prevState => ({ currentStep: prevState.currentStep + 1 }));
    }, 1500);
  }

  handleShareDataClick = () => {
    const handleTabChange = (activeInfo) => {
      tabs.get(activeInfo.tabId, (tab) => {
        if (tab.id && tab.id === this.onboardingId) {
          return;
        }

        this.addOnTabChangedListener();
        tabs.onActivated.removeListener(handleTabChange);
      });
    };

    tabs.onActivated.addListener(handleTabChange);

    this.removeOnTabChangedListener();

    this.background.openPrivacyReport();
    telemetry.shareDataClick();
  }

  updatePrefs = () => {
    const prefs = [];

    this.state.steps.forEach(async (step) => {
      if (step.name === 'antiphishing') {
        prefs.push({ name: 'cliqz-anti-phishing-enabled', value: step.enabled });
      }
      if (step.name === 'adblocking') {
        prefs.push({ name: 'cliqz-adb', value: step.enabled });
      }
      if (step.name === 'antitracking') {
        prefs.push({ name: 'modules.antitracking.enabled', value: step.enabled });
      }
      await this.background.setPrefs(prefs);
    });
  }

  render() {
    const {
      currentStep,
      popupProtection,
      popupSkip,
      steps,
    } = this.state;

    return (
      <div className="app">
        <Layout
          currentStep={currentStep}
          stepStates={steps}
          onToggle={this.onToggle}
          handleShareDataClick={this.handleShareDataClick}
          handleImportBtnClick={this.handleImportBtnClicked}
          handleInfoNavigationClick={this.handleInfoNavigationClick}
          finalComponentDidUpdate={this.finalComponentDidUpdate}
          skipOnSkipClick={this.skipOnSkipClick}
        />

        {popupSkip && (
          <PopupConfirmation
            className="popup_skip"
            onActionBtnClick={this.skipOnContinueClick}
            onSkipBtnClick={this.skipOnSkipClick}
            onCloseBtnClick={this.skipOnCloseClick}
            onHideClick={this.skipOnHideClick}
          />
        )}

        {popupProtection && (
          <PopupConfirmation
            className="popup_protection"
            onActionBtnClick={this.protectionOnActivateClick}
            onSkipBtnClick={this.protectionOnProceedClick}
            onCloseBtnClick={this.protectionOnCloseClick}
            onHideClick={this.protectionOnHideClick}
          />
        )}

        <PopupControlCenter
          visible={currentStep === 6}
        />
      </div>
    );
  }
}
