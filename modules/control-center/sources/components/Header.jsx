import React from 'react';

export default function Header({ localize, safe }) {
  return (
    <header id="header">
      <div className="pause">
        <img src="./images/cliqz.svg" alt="Cliqz" />
      </div>
      <div className="title">
        {
          safe
            ? (
              <span id="noWarning">
                {localize('control_center_txt_header')}
              </span>
            ) : (
              <React.Fragment>
                <img src="./images/alert-privacy.svg" alt="warning" />
                <span
                  className="warning"
                  id="warning"
                >
                  {localize('control_center_txt_header_not')}
                </span>
              </React.Fragment>
            )
        }
      </div>
    </header>
  );
}
