import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';

const rootElement = document.getElementById('control-center-react');

const app = React.createElement(App, {
  container: rootElement
}, null);

ReactDOM.render(
  app,
  rootElement
);
