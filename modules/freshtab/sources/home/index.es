/* global document */
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/app';
import checkIfChromeReady from '../../core/content/ready-promise';
import cliqz from './cliqz';
import config from '../../core/config';
import { tt } from './i18n';

const EXPECTED_ONBOARDING_VERSION = 3;

const renderDOM = async (rootElement, freshtabConfig) => {
  ReactDOM.render(
    React.createElement(App, {
      config: freshtabConfig
    }, null),
    rootElement
  );
};

(async () => {
  const rootElement = document.getElementById('root');
  await checkIfChromeReady();
  const freshtabConfig = await cliqz.freshtab.getConfig();
  const { isUserOnboarded, onboardingVersion } = freshtabConfig;
  if (config.settings.onboardingVersion >= EXPECTED_ONBOARDING_VERSION && !isUserOnboarded) {
    document.title = tt('onboarding_tab_name');
    document.body.className = '';
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL(`modules/onboarding-v${onboardingVersion}/index.html`);
    iframe.id = 'onboarding';
    document.body.appendChild(iframe);
  }
  renderDOM(rootElement, freshtabConfig);
})();
