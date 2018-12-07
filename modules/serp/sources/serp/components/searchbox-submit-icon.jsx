import React from 'react';

export default (props = {}) => {
  const handleSubmitIconClick = typeof props.handleSubmitIconClick === 'function'
    ? props.handleSubmitIconClick
    : () => {};

  const cssClasses = props.cssClasses || [];

  const telemetry = props.telemetry || {};

  return (
    <a
      onClick={handleSubmitIconClick}
      href="/"
      className={['searchbox-submit-icon'].concat(cssClasses).join(' ')}
      data-telemetry={telemetry.name}
      data-engine={telemetry.engine}
      data-view={telemetry.view}
      data-category={telemetry.category}
      data-session={telemetry.session}
    >
      Search
    </a>
  );
};
