import React from 'react';
import ReactDOM from 'react-dom';
import Main from './checkout/Main';
import Feedback from './checkout/Feedback';
import { resize } from './utils';

export default function draw(data = {}) {
  const { view = '' } = data;
  const View = {
    checkout: Main,
    feedback: Feedback,
    reason: Feedback,
  }[view];
  if (!View) { return; }
  window.__globals_resize = resize({ type: 'checkout' });
  ReactDOM.render(
    React.createElement(View, data, null),
    document.getElementById('cliqz-offers-templates'),
    () => window.__globals_resize({ fullscreen: view === 'checkout' })
  );
}
