/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable react/button-has-type */

import React from 'react';

import DropdownArrow from './DropdownArrow';

export default function Dropdown(props) {
  const {
    dropdownFrame: data = {},
    dropdown,
    handleChange,
    localize,
    openDropdown,
    selected
  } = props;
  const legends = {
    website: localize('control_center_this_site'),
    domain: localize('control_center_this_domain'),
    all: localize('control_center_all_sites'),
  };

  return (
    <span className="new-dropdown">
      <button className="dropdown-btn" onClick={openDropdown}>
        <span
          className="dropdown-content-option-text"
          data-action="clickable"
          data-role="dropdown"
        >
          { selected === data.website && legends.website }
          { selected === data.domain && legends.domain }
          { selected === data.all && legends.all }
        </span>
        <DropdownArrow classes="arr" />
      </button>

      <div className={`new-dropdown-content ${dropdown ? 'visible' : ''}`}>
        {
          Object.keys(data).map(d => (
            <a
              className={`dropdown-content-option thisSiteText ${selected === data[d] ? 'selected' : ''}`}
              role="button"
              key={data[d]}
              value={data[d]}
              data-action="clickable"
              onClick={() => handleChange(data[d])}
            >
              {legends[d]}
            </a>
          ))
        }
      </div>
    </span>
  );
}
