import React from 'react';
import PropTypes from 'prop-types';

import t from '../../i18n';
import Session from './partials/session';

class HistoryResults extends React.Component {
  state = {
    deletedSessionId: -1,
  };

  getSessionClass = sessionId => (
    this.state.deletedSessionId === sessionId ? 'deleted' : ''
  );

  handleClick = (sessionId) => {
    setTimeout(() => this.props.deleteSession(sessionId), 500);
    this.setState({ deletedSessionId: sessionId });
  };

  generateHistory = history =>
    history.map((clusterItem) => {
      const sessionId = clusterItem[0].sessionId;

      return (
        <div
          className={`session-container ${this.getSessionClass(sessionId)}`}
          key={sessionId}
        >
          <button
            className="delete-session-btn"
            onClick={() => this.handleClick(sessionId)}
            type="button"
          />

          <Session
            visits={clusterItem}
            deleteVisit={this.props.deleteVisit}
            handleVisitKeywordClick={this.props.handleVisitKeywordClick}
            query={this.props.query}
          />
        </div>
      );
    });

  render() {
    const { hasReachedLastEntry, history, query } = this.props;
    return (
      <section className="history-results">
        {history.length === 0 && query.length > 0 && (
          <p className="no-further-history">{`${t('no_search_result')} ${query}`}</p>
        )}

        {history.length === 0 && query.length === 0 && (
          <p className="no-further-history">{t('no_history_entry')}</p>
        )}

        {this.generateHistory(history)}

        {history.length !== 0 && hasReachedLastEntry && (
          <p className="no-further-history">{t('no_further_history_entry')}</p>
        )}
      </section>
    );
  }
}

HistoryResults.propTypes = {
  deleteSession: PropTypes.func.isRequired,
  deleteVisit: PropTypes.func.isRequired,
  hasReachedLastEntry: PropTypes.bool.isRequired,
  history: PropTypes.array.isRequired,
  query: PropTypes.string.isRequired,
  handleVisitKeywordClick: PropTypes.func.isRequired,
};

export default HistoryResults;
