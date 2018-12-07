import React from 'react';
import classNames from 'classnames';
import SearchboxSubmitIcon from './searchbox-submit-icon';

export default ({
  handleSubmitIconClick,
  shouldDisplayLookAndFeelV1,
  shouldDisplayLookAndFeelV3,
  telemetryView,
  session,
}) => {
  const searchboxSubmitIconClasses = classNames({
    'searchbox-v1-submit-icon': shouldDisplayLookAndFeelV1,
    'searchbox-v3-submit-icon': shouldDisplayLookAndFeelV3,
    suggestion: true,
  });

  return (
    <SearchboxSubmitIcon
      handleSubmitIconClick={handleSubmitIconClick}
      cssClasses={searchboxSubmitIconClasses}
      telemetry={{
        name: 'search-engine',
        engine: 'cliqz',
        view: telemetryView,
        category: null,
        session,
      }}
    />
  );
};
