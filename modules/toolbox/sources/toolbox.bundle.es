import React from 'react';
import ReactDOM from 'react-dom';
import App from './toolbox/components/app';
import checkIfChromeReady from '../core/content/ready-promise';

(async function start() {
  await checkIfChromeReady();

  ReactDOM.render(
    React.createElement(App, {}, null),
    document.getElementById('root')
  );
}());
