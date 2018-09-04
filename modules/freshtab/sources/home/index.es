/* global document */
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/app';
import checkIfChromeReady from '../../core/content/ready-promise';

(async () => {
  await checkIfChromeReady();
  ReactDOM.render(
    React.createElement(App, {}, null),
    document.getElementById('root')
  );
})();
