import React from 'react';

export default ({ item = {}, idx } = {}) => (
  <div
    className="searchbox-results-item result"
    data-idx={idx}
  >
    <a
      href={item.href}
      className="searchbox-results-item-title"
      data-telemetry="result"
      data-telemetry-element="title"
    >
      {item.title}
    </a>
    <div>
      <a
        href={item.href}
        className="searchbox-results-item-url"
        data-telemetry="result"
        data-telemetry-element="url"
      >
        {item.hrefText}
      </a>
    </div>
    {
      item.description &&
      (
        <div
          className="searchbox-results-item-description"
        >
          {item.description}
        </div>
      )
    }
  </div>
);
