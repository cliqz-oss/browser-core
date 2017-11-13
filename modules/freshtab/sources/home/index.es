/* global document, localStorage */
import React from 'react';
import ReactDOM from 'react-dom';
import cliqz from './cliqz';
import App from './components/app';
import checkIfChromeReady from './ready-promise';

checkIfChromeReady().then(() => {
  if (document.visibilityState === 'visible') {
    cliqz.core.setUrlbar('');
  }
  ReactDOM.render(
    React.createElement(App, {}, null),
    document.getElementById('root')
  );
});
