/* global document */
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/app';
import checkIfChromeReady from './ready-promise';

checkIfChromeReady().then(() => {
  ReactDOM.render(
    React.createElement(App, {}, null),
    document.getElementById('root')
  );
});
