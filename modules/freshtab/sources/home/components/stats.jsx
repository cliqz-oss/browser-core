/* global window */

import React from 'react';
import { statsHoverSignal, statsClickSignal } from '../services/telemetry/stats';

function StatsBox({ item, hoverFn, clickFn }) {
  const boxClassName = item.disabled ? 'stats-box disabled' : 'stats-box';
  return (
    <a
      onMouseEnter={() => hoverFn(item)}
      onClick={() => clickFn(item)}
      href={item.link}
      className={boxClassName}
      tabIndex="-1"
    >
      <p className="stats-title" title={item.title}>{item.title}</p>
      <p className="stats-value">
        <span style={{ '--mask-image': `url(../${item.icon})` }} />
        <span>{item.val}</span>
      </p>
      <p className="stats-description">{item.description}</p>
      <p className="learn-more">Learn more</p>
    </a>
  );
}

function StatsEmptyBox({ promoData, toggleComponent }) {
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  if (!promoData.brand) {
    return null;
  }

  return (
    <div className="stats-empty-box">
      <span className="close-btn-wrapper">
        <span className="cliqz-close-btn" onClick={() => toggleComponent('stats')} />
      </span>

      <div className="labels">
        <p
          className={`brand ${promoData.brand.icon ? 'with-icon' : ''}`}
          style={{ backgroundImage: `url(${promoData.brand.icon})` }}
        >
          {promoData.brand.name}
        </p>
        <p className="description">
          <span>
            {promoData.description}
          </span>
          <a className="learn-more" href={promoData.learnMore.link}>
            {promoData.learnMore.text}
          </a>
        </p>
      </div>
      <div className="buttons">
        <div>
          {promoData.buttons.map(button =>
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

export default class Stats extends React.PureComponent {
  handleHover = (card) => {
    statsHoverSignal(card);
  }

  handleClick = (card) => {
    statsClickSignal(card);
  }

  render() {
    return (
      <div className="stats">
        <div className="stats-container">
          <div className={`stats-content ${this.props.stats.isEmpty ? 'with-empty-box' : ''}`}>
            {
              (
                this.props.stats.data || []).map(item =>
                (
                  <StatsBox
                    key={item.title}
                    item={item}
                    hoverFn={this.handleHover}
                    clickFn={this.handleClick}
                  />))
            }
            {
              this.props.stats.isEmpty
                && (
                  <StatsEmptyBox
                    promoData={this.props.stats.promoData}
                    toggleComponent={this.props.toggleComponent}
                  />)
            }
          </div>
        </div>
      </div>
    );
  }
}
