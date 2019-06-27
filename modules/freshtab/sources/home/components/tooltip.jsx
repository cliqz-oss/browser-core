import React from 'react';
import PropTypes from 'prop-types';

function Tooltip({
  isOpen,
  title,
  description,
  explore,
  later,
  handleExploreClick,
  handleLaterClick,
  closeTooltip,
}) {
  return (
    <div
      role="presentation"
      className={`tooltip ${isOpen ? '' : 'close'}`}
    >
      <div className="row">
        <aside className="tooltip-icon">
          <img src="./images/settings-icon.svg" alt="settings icon" />
        </aside>
        <div className="tooltip-content">
          <h1>{title}</h1>
          <p>{description}</p>
          <span>
            <button
              id="explore"
              type="button"
              className="explore"
              onClick={handleExploreClick}
            >
              {explore}
            </button>
            <button
              type="button"
              className="later"
              onClick={handleLaterClick}
            >
              {later}
            </button>
          </span>
        </div>
        <aside className="tooltip-close">
          <button onClick={closeTooltip} type="button">X</button>
        </aside>
      </div>
    </div>
  );
}

Tooltip.propTypes = {
  isOpen: PropTypes.bool,
  title: PropTypes.string,
  description: PropTypes.string,
  explore: PropTypes.string,
  later: PropTypes.string,
  handleExploreClick: PropTypes.func,
  handleLaterClick: PropTypes.func,
  closeTooltip: PropTypes.func,
};

export default Tooltip;
