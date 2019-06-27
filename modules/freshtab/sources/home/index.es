/* global document */
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/app';
import checkIfChromeReady from '../../core/content/ready-promise';
import cliqz from './cliqz';
import config from '../../core/config';

const EXPECTED_ONBOARDING_VERSION = '3.1';

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
  if (config.settings.onBoardingVersion === EXPECTED_ONBOARDING_VERSION) {
    const { isUserOnboarded } = freshtabConfig;
    if (!isUserOnboarded) {
      document.body.className = '';
      const iframe = document.createElement('iframe');
      iframe.src = chrome.runtime.getURL('modules/onboarding-v3/index.html');
      iframe.style.position = 'fixed';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      rootElement.appendChild(iframe);
    } else {
      renderDOM(rootElement, freshtabConfig);
    }
  } else {
    renderDOM(rootElement, freshtabConfig);
  }
})();
