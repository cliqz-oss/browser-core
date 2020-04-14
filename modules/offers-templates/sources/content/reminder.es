import React from 'react';
import ReactDOM from 'react-dom';
import Main from './reminder/Main';
import { resize } from './utils';

export default function draw(data = {}) {
  window.__globals_resize = resize({ type: 'reminder' });
  ReactDOM.render(
    React.createElement(Main, data, null),
    document.getElementById('cliqz-offers-templates'),
    window.__globals_resize
  );
}
