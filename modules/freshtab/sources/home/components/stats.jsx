/* global window */

import React from 'react';
import PropTypes from 'prop-types';
import Link from './partials/link';
import { tt } from '../i18n';
import { statsHoverSignal, statsClickSignal } from '../services/telemetry/stats';

function StatsBox({
  clickFn,
  item,
  item: {
    description,
    disabled,
    icon,
    link,
    title,
    val,
  },
  hoverFn,
}) {
  const boxClassName = disabled ? 'stats-box disabled' : 'stats-box';
  return (
    <Link
      className={boxClassName}
      href={link}
      onClick={() => clickFn(item)}
      onMouseEnter={() => hoverFn(item)}
    >
      <p className="stats-title" title={title}>{title}</p>
      <p className="stats-value">
        <span style={{ '--mask-image': `url(../${icon})` }} />
        <span>{val}</span>
      </p>
      <p className="stats-description">{description}</p>
      <p className="learn-more">{tt('learnMore')}</p>
    </Link>
  );
}

StatsBox.propTypes = {
  clickFn: PropTypes.func,
  item: PropTypes.shape({
    description: PropTypes.string,
    disabled: PropTypes.bool,
    icon: PropTypes.string,
    link: PropTypes.string,
    title: PropTypes.string,
    val: PropTypes.string,
  }),
  hoverFn: PropTypes.func,
};

function StatsEmptyBox({
  promoData: {
    brand,
    brand: {
      icon,
      name,
    },
    buttons,
    description,
    learnMore,
  },
  toggleComponent,
}) {
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  if (!brand) {
    return null;
  }

  return (
    <div className="stats-empty-box">
      <span className="close-btn-wrapper">
        <span className="cliqz-close-btn" onClick={() => toggleComponent('stats')} />
      </span>

      <div className="labels">
        <p
          className={`brand ${icon ? 'with-icon' : ''}`}
          style={{ backgroundImage: `url(${icon})` }}
        >
          {name}
        </p>
        <p className="description">
          <span>
            {description}
          </span>
          <a className="learn-more" href={learnMore.link}>
            {learnMore.text}
          </a>
        </p>
      </div>
      <div className="buttons">
        <div>
          {buttons.map(button =>
            (
              <a
                key={button.label}
                className={`stats-btn ${button.className}`}
                href={button.link}
                tabIndex="-1"
              >
                {button.label}
              </a>
            ))
          }
        </div>
      </div>
    </div>
  );
}

StatsEmptyBox.propTypes = {
  promoData: PropTypes.shape({
    brand: PropTypes.shape({
      icon: PropTypes.object,
      name: PropTypes.string,
    }),
    buttons: PropTypes.array,
    description: PropTypes.string,
    learnMore: PropTypes.string,
  }),
  toggleComponent: PropTypes.func,
};

export default function Stats({
  stats: {
    data,
    isEmpty,
    promoData,
  },
  toggleComponent,
}) {
  const handleHover = (card) => {
    statsHoverSignal(card);
  };

  const handleClick = (card) => {
    statsClickSignal(card);
  };

  return (
    <div className="stats">
      <div className="stats-container">
        <div className={`stats-content ${isEmpty ? 'with-empty-box' : ''}`}>
          {
            (
              data || []).map(item =>
              (
                <StatsBox
                  clickFn={handleClick}
                  item={item}
                  key={item.title}
                  hoverFn={handleHover}
                />))
          }
          {
            isEmpty
              && (
                <StatsEmptyBox
                  promoData={promoData}
                  toggleComponent={toggleComponent}
                />)
          }
        </div>
      </div>
    </div>
  );
}

Stats.propTypes = {
  stats: PropTypes.shape({
    data: PropTypes.array,
    isEmpty: PropTypes.bool,
    promoData: PropTypes.object,
  }),
  toggleComponent: PropTypes.func,
};
