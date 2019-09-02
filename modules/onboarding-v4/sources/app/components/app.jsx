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

import Antitracking from './antitracking';
import Adblocking from './adblocking';
import Antiphishing from './antiphishing';
import Dots from './dots';
import Final from './final';
import ImportData from './import-data';
import PopupConfirmation from './popup-confirmation';
import PopupControlCenter from './popup-control-center';
import Welcome from './welcome';

import * as telemetry from '../services/telemetry/telemetry';

import t from '../../i18n';

export default class App extends React.Component {
  state = {
    currentStep: -1,
    steps: [
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

    setTimeout(() => {
      this.setState({ currentStep: 0 });
      this.updateStep(0, { visited: true });
    }, 700);
  }

  get view() {
    const index = this.state.currentStep;
    const name = this.state.steps[index].name;
    if (index === 3) {
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
    chrome.cliqz.openImportDialog();
  }

  navigateToLastStep = () => {
    this.setState(prevState => ({ currentStep: prevState.currentStep + 1 }));
  }

  // dots component

  handleDotsComponentClicked = (index) => {
    telemetry.dotsClick(this.view, index);
    this.setState({
      currentStep: index,
    }, () => { telemetry.showStep(this.view); });
  }

  // next button

  get nextButtonClass() {
    const stepName = this.state.steps[this.state.currentStep].name;
    const isEnabled = this.state.steps[this.state.currentStep].enabled;
    return `next-button ${stepName} ${isEnabled ? 'active' : ''}`;
  }

  handleNextBtnClicked = () => {
    telemetry.nextBtnClick(this.view);
    if (this.state.currentStep < 3) {
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
          if (ind < 3) {
            return (
              {
                ...step,
                enabled: true,
              }
            );
          }
          return step;
        }),
        currentStep: 4,
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
          if (ind < 3) {
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

  render() {
    const {
      currentStep,
      popupProtection,
      popupSkip,
      steps,
    } = this.state;

    return (
      <div className="app">
        <div className={popupSkip || popupProtection ? 'main blur' : 'main'}>
          <Welcome
            visible={currentStep === -1}
          />

          <Antitracking
            visible={currentStep === 0}
            stepState={steps[0]}
            onToggle={this.onToggle}
          />

          <Adblocking
            visible={currentStep === 1}
            stepState={steps[1]}
            onToggle={this.onToggle}
          />

          <Antiphishing
            visible={currentStep === 2}
            stepState={steps[2]}
            onToggle={this.onToggle}
          />

          <ImportData
            visible={currentStep === 3}
            stepState={steps[3]}
            onClick={this.handleImportBtnClicked}
          />

          <Final
            cliqz={this.background}
            showSkipPopup={this.showSkipPopup}
            stepsState={this.state.steps.slice(0, 3)}
            updateStep={this.navigateToLastStep}
            visible={currentStep === 4}
            removeOnTabChangedListener={this.removeOnTabChangedListener}
          />

          <PopupControlCenter
            visible={currentStep === 5}
          />

          {currentStep >= 0 && currentStep < 4 && (
            <React.Fragment>
              <Dots
                currentStep={currentStep}
                stepsState={steps}
                updateCurrentStep={this.handleDotsComponentClicked}
              />

              <button
                type="button"
                className={this.nextButtonClass}
                onClick={this.handleNextBtnClicked}
              >
                {t('button_next')}
              </button>

              <button
                type="button"
                className="skip-button"
                onClick={this.handleSkipBtnClicked}
              >
                {t('button_skip')}
              </button>
            </React.Fragment>
          )}
        </div>

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
      </div>
    );
  }
}
