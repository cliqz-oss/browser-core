import React from 'react';
import PropTypes from 'prop-types';
import Button from './partials/button';
import Logo from './logo';
import EditSpeedDial from './edit-speed-dial';

function SpeedDial({
  dial,
  dial: {
    custom,
    displayTitle,
    logo,
    url,
  },
  removeSpeedDial,
  shouldAnimate,
  updateModalState,
  updateSpeedDial,
  visitSpeedDial,
}) {
  return (
    <a
      className={`dial ${shouldAnimate ? 'with-animation' : ''}`}
      title={displayTitle}
      href={url}
      tabIndex="-1"
      onClick={() => {
        visitSpeedDial();
      }}
    >
      <Logo logo={logo} />
      {custom
        ? (
          <EditSpeedDial
            dial={dial}
            removeDial={removeSpeedDial}
            updateDial={updateSpeedDial}
            updateModalState={updateModalState}
          />
        )
        : (
          <Button
            className="delete"
            label="X"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              removeSpeedDial();
            }}
          />
        )
      }
      <div className="title">{displayTitle}</div>
    </a>
  );
}

SpeedDial.propTypes = {
  dial: PropTypes.shape({
    custom: PropTypes.bool,
    displayTitle: PropTypes.string,
    logo: PropTypes.object,
    url: PropTypes.string,
  }),
  removeSpeedDial: PropTypes.func,
  shouldAnimate: PropTypes.bool,
  updateModalState: PropTypes.func,
  updateSpeedDial: PropTypes.func,
  visitSpeedDial: PropTypes.func,
};

export default SpeedDial;
