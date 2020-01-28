import React from 'react';
import PropTypes from 'prop-types';

const Navigation = ({ urls: { NEW_TAB_URL } }) => (
  <nav className="navigation">
    <span><a href={NEW_TAB_URL} className="freshtab-button">Home</a></span>
  </nav>
);

Navigation.propTypes = {
  urls: PropTypes.exact({
    NEW_TAB_URL: PropTypes.string,
  })
};

export default Navigation;
