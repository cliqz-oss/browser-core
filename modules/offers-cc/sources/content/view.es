import React from 'react';
import ReactDOM from 'react-dom';
import Main from './Main';
import Tooltip from './Tooltip';
import TooltipExtra from './TooltipExtra';
import { resize } from './common/utils';

export default function draw(data) {
  const { showTooltip = false, isGeneric = false } = data;
  const tooltip = isGeneric ? Tooltip : TooltipExtra;
  ReactDOM.render(
    React.createElement(showTooltip ? tooltip : Main, { data }, null),
    document.getElementById('cliqz-offers-cc')
  );
  resize({ tooltip: showTooltip });
}
