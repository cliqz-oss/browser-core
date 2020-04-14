import React from 'react';
import ReactDOM from 'react-dom';
import Main from './control-center/Main';
import Tooltip from './control-center/Tooltip';
import { resize } from './utils';

export default function draw(data) {
  const {
    showTooltip = false,
    products = {},
    autoTrigger = false,
  } = data;
  window.__globals_resize = resize({
    type: showTooltip ? 'tooltip' : 'card',
    products,
    autoTrigger,
  });
  ReactDOM.render(
    React.createElement(showTooltip ? Tooltip : Main, { data }, null),
    document.getElementById('cliqz-offers-templates'),
    window.__globals_resize
  );
}
