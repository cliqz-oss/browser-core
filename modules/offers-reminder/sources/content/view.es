import React from 'react';
import ReactDOM from 'react-dom';
import Main from './Main';
import { resize } from './common/utils';

export default function draw(data = {}) {
  ReactDOM.render(
    React.createElement(Main, data, null),
    document.getElementById('cliqz-offers-reminder')
  );
  resize();
}
