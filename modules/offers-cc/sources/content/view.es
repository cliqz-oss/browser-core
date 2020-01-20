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

  const newData = {
    ...data,
    abtestInfo: {
      popupsCopyCode: 'one-step', // one-step | two-step
    },
  };

  ReactDOM.render(
    React.createElement(showTooltip ? Tooltip : Main, { data: newData }, null),
    document.getElementById('cliqz-offers-cc'),
    () => resize({ type: showTooltip ? 'tooltip' : 'card', products, autoTrigger })
  );
}
