import React from 'react';
import WhyCliqzBlock from './why-cliqz-block';

const renderWhyCliqzBlock = () => <WhyCliqzBlock />;

export default (props = {}) => {
  const searchField = props.searchField || null;
  const onSubmitIconClick = typeof props.onSubmitIconClick === 'function'
    ? props.onSubmitIconClick
    : () => {};

  return (
    <div
      className="searchbox-layout"
    >
      <div
        className="searchbox-container"
      >
        <div
          className="searchbox-logo"
        />
        <div
          className="searchbox-field-layout"
          data-view="landing"
        >
          {searchField}
          <a
            href="/"
            onClick={onSubmitIconClick}
            className="searchbox-field-submit-icon suggestion"
            data-telemetry="search-engine"
            data-engine="cliqz"
            data-view="landing"
            data-category={null}
          >Search</a>
        </div>
        {renderWhyCliqzBlock()}
      </div>
    </div>
  );
};
