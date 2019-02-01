import React from 'react';
import PropTypes from 'prop-types';

function Logo({
  logo: {
    backgroundColor,
    backgroundImage,
    color,
    text
  }
}) {
  const hasBgImage = backgroundImage !== undefined;
  return (
    <div>
      { hasBgImage
        ? (
          <div
            className="logo"
            style={{
              color,
              textIndent: '-1000em',
              backgroundImage,
              backgroundColor: `#${backgroundColor}`,
            }}
          >
            { text }
          </div>
        )
        : (
          <div
            className="logo"
            style={{
              color,
              backgroundColor: `#${backgroundColor}`,
            }}
          >
            { text}
          </div>
        )
      }
    </div>
  );
}

Logo.propTypes = {
  logo: PropTypes.shape({
    color: PropTypes.string,
    backgroundImage: PropTypes.string,
    backgroundColor: PropTypes.string,
    text: PropTypes.string,
  }),
};

export default Logo;
