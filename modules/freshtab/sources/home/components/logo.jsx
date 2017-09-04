import React from 'react';
import PropTypes from 'prop-types';

function Logo(props) {
  const hasBgImage = props.logo.backgroundImage !== undefined;
  return (
    <div>
      { hasBgImage ?
        <div
          className="logo"
          style={{
            color: props.logo.color,
            textIndent: '-1000em',
            backgroundImage: props.logo.backgroundImage,
            backgroundColor: `#${props.logo.backgroundColor}`,
          }}
        >
          { props.logo.text }
        </div>
        :
        <div
          className="logo"
          style={{
            color: props.logo.color,
            backgroundColor: `#${props.logo.backgroundColor}`,
          }}
        >
          { props.logo.text}
        </div>
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
