import React from 'react';
import ReactDOM from 'react-dom';
import Main from './Main';
import Tooltip from './Tooltip';
import { resize } from './common/utils';

export default function draw(data) {
  const {
    showTooltip = false,
    products = {},
    autoTrigger = false,
  } = data;

  ReactDOM.render(
    React.createElement(showTooltip ? Tooltip : Main, { data }, null),
    document.getElementById('cliqz-offers-cc'),
    () => resize({ type: showTooltip ? 'tooltip' : 'card', products, autoTrigger })
  );
}
