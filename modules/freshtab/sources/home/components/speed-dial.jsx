import React from 'react';
import PropTypes from 'prop-types';
import Logo from './logo';

function SpeedDial(props) {
  return (
    <div className="dial" title={props.dial.url}>
      <a
        href={props.dial.url}
        onClick={() => {
          props.visitSpeedDial();
        }}
      >
        <Logo logo={props.dial.logo} />
        <button
          className="delete"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            props.removeSpeedDial(props.dial);
          }
        }
        >
          X
        </button>
        <div className="title">{props.dial.displayTitle}</div>
      </a>
    </div>
  );
}

SpeedDial.propTypes = {
  dial: PropTypes.shape({
    logo: {},
    url: PropTypes.string,
    displayTitle: PropTypes.string,
  }),
  removeSpeedDial: PropTypes.func,
};

export default SpeedDial;
