import React from 'react';

export default ({ text = '', cssClasses = [] }) => (
  <span className={['anzeige-label'].concat(cssClasses).join(' ')}>
    { text }
  </span>
);
