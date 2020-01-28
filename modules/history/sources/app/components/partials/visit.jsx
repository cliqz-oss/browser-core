import React from 'react';
import PropTypes from 'prop-types';

import { getLastVisited } from '../../../../core/helpers/date';
import Highlight from './highlight';

const DASH = '\u2015';
export default class Visit extends React.Component {
  state = {
    isDeleted: false,
  };

  renderLastVisited = (date) => {
    const { exact, fromNow } = getLastVisited(date);
    return (
      <div className="visit-content date">
        <span className="from-now-date">{fromNow}</span>
        <span className="exact-date">{exact}</span>
      </div>
    );
  };

  getVisitClass = () => (this.state.isDeleted ? 'deleted' : '');

  handleClick = () => {
    const { deleteVisit, visit } = this.props;
    setTimeout(() => deleteVisit({ visitId: visit.lastVisitedAt }), 500);
    this.setState({ isDeleted: true });
  };

  getTextClass = () => (
    this.props.visit.logo.backgroundImage === undefined
      ? ''
      : 'logo-text-not-shown'
  );

  getDomainClass = () => (this.props.isFirst ? 'first' : '')

  getDomain = ({ host }) => (
    host === 'cliqz.com'
      ? 'Cliqz'
      : host
  )

  visitClickHandler = (event) => {
    const {
      visit: {
        url,
        keyword
      },
      handleVisitKeywordClick,
    } = this.props;

    if (!keyword) {
      event.preventDefault();
      return;
    }

    handleVisitKeywordClick(event, keyword, url);
  }

  render() {
    const {
      visit: {
        baseUrl,
        host,
        lastVisitedAt,
        logo: { backgroundImage, color, text },
        title,
        url,
        keyword,
      },
      query,
    } = this.props;
    const backgroundColor = `#${this.props.visit.logo.backgroundColor}`;

    return (
      <div className={`visit-container ${this.getVisitClass()}`}>
        <div className={`domain ${this.getDomainClass()}`}>
          {this.getDomain({ host: host || '' })}
        </div>
        <button className="delete-visit-btn" onClick={this.handleClick} type="button" />

        <a className="visit" href={url} onClick={this.visitClickHandler}>
          <div className="logo" style={{ backgroundColor, color, backgroundImage }}>
            <span className={this.getTextClass()}>{text}</span>
          </div>
          <div className="visit-content title">
            {
              keyword
              && (
                <button type="button" className="keyword">
                  <img className="keyword-image" src="./images/glass-dark.svg" alt="Search Icon" />
                  {keyword}
                </button>
              )
            }
            {
              keyword
              && (
                <span className="keyword-dash">{DASH}</span>
              )
            }
            <Highlight text={title} em={query} />
          </div>
          <div className="visit-content url">
            <Highlight text={baseUrl} em={query} />
          </div>
          {this.renderLastVisited(lastVisitedAt / 1000)}
        </a>
      </div>
    );
  }
}

Visit.propTypes = {
  deleteVisit: PropTypes.func.isRequired,
  isFirst: PropTypes.bool.isRequired,
  visit: PropTypes.object.isRequired,
  handleVisitKeywordClick: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
};
