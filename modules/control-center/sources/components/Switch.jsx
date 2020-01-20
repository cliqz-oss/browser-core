/* eslint-disable jsx-a11y/interactive-supports-focus */
import React from 'react';

export default function Switch(props) {
  const { handleClick, localize, status } = props;
  const on = status === 'active';

  return (
    <span>
      { on && <span className="switch-label" value="on">{localize('control_center_switch_on')}</span> }
      { !on && <span className="switch-label" value="off">{localize('control_center_switch_off')}</span> }
      <span
        className="cqz-switch"
        onClick={handleClick}
        role="button"
      >
        <span data-action="clickable" className="cqz-switch-box" />
      </span>
    </span>
  );
}
