import React from 'react';

export default (props = {}) => {
  const text = props.text || '';
  const cssClasses = props.cssClasses || [
    'tooltip', 'tooltip-above'
  ];

  if (!text) {
    return null;
  }

  return (
    <div
      className={cssClasses.join(' ')}
    >
      {text}
    </div>
  );
};
