import React from 'react';

export default function Tooltip({
  headline,
  learnMoreText,
  openLearnMoreLink,
  text,
}) {
  return (
    <div className="tooltip">
      <div className="tooltip-headline">{headline}</div>
      <div className="tooltip-description">{text}</div>
      <div className="tooltip-learn-more">
        <button className="tooltip-learn-more-btn" type="button" onClick={openLearnMoreLink}>{learnMoreText}</button>
      </div>
    </div>
  );
}
