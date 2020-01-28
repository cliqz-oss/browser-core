import React from 'react';
import ReactDOM from 'react-dom';
import Main from './Main';
import Feedback from './Feedback';
import { resize } from './common/utils';

export default function draw(data = {}) {
  const { view = '' } = data;
  const View = {
    checkout: Main,
    feedback: Feedback,
    reason: Feedback,
  }[view];
  if (!View) { return; }
  ReactDOM.render(
    React.createElement(View, data, null),
    document.getElementById('cliqz-offers-checkout'),
    () => resize({ fullscreen: view === 'checkout' })
  );
}
