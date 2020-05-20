import React from 'react';
import ReactDOM from 'react-dom';
import App from './environment/App';

const rootElement = document.getElementById('app');

const app = React.createElement(App, {
  container: rootElement
}, null);

ReactDOM.render(
  app,
  rootElement
);
