import React from 'react';
import Logo from './logo';
import EditSpeedDial from './edit-speed-dial';

function SpeedDial(props) {
  return (
    <a
      className={`dial ${props.shouldAnimate ? 'with-animation' : ''}`}
      title={props.dial.displayTitle}
      href={props.dial.url}
      tabIndex="-1"
      onClick={() => {
        props.visitSpeedDial();
      }}
    >
      <Logo logo={props.dial.logo} />
      {props.dial.custom
        ? (
          <EditSpeedDial
            dial={props.dial}
            isCustom={props.dial.isCustom}
            removeDial={props.removeSpeedDial}
            updateDial={props.updateSpeedDial}
            toggleModal={props.toggleModal}
            updateModalState={props.updateModalState}
          />
        )
        : (
          <button
            type="button"
            className="delete"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.removeSpeedDial();
            }
            }
          >
            X
          </button>
        )
      }
      <div className="title">{ props.dial.displayTitle}</div>
    </a>
  );
}

export default SpeedDial;
