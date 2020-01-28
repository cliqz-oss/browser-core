import React from 'react';

import cliqz from '../../cliqz';
import {
  sortClusterSessionsFromRecentToOld,
  getFirstVisitedTime,
  getParamFromUrl,
  createHistoryCluster,
  createClusterSessions,
} from '../../helpers';

import Filters from './filters';
import HistoryResults from './history-results';
import Navigation from './navigation';
import Preloader from './preloader';
import TopBar from './top-bar';

const LIMIT = 100;

const fetch = async (
  { from = undefined,
    to = undefined,
    query = '' } = {}
) => cliqz.history.getHistory({
  frameEndsAt: to,
  frameStartsAt: from,
  limit: LIMIT,
  query,
});

const sendUserFeedback = async (feedback) => {
  await cliqz.history.sendUserFeedback(feedback);
};

export default class App extends React.Component {
  timer = null;

  state = {
    // undefined values are here by FF History API reasons;
    // That means we request ALL items from the history restricted
    // by the LIMIT value.
    frameEndsAt: undefined,
    frameStartsAt: undefined,
    hasFinishedFetch: false,
    hasReachedLastEntry: false,
    history: [],
    query: '',
    selectedBtn: 0,
  }

  urls = {};

  async componentDidMount() {
    this.urls = await cliqz.history.getConstUrls();
    window.addEventListener('hashchange', this.handleHashChange);

    this.handleHashChange();
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.handleHashChange);
  }

  setupHistoryKeywords(history) {
    history.forEach((item) => {
      const q = getParamFromUrl(item.url, 'q');
      if (q) {
        // eslint-disable-next-line no-param-reassign
        item.keyword = q;
      }
    });
  }

  showHistoryDeletionPopup = () => {
    cliqz.history.showHistoryDeletionPopup().then(async () => {
      // History items were deleted via Browser Modal Window.
      const { query } = this.state;
      const { history } = await fetch({ query });

      this.setState({
        history,
      });
    });
  }

  handleHashChange = async () => {
    const query = getParamFromUrl(document.location.hash, 'query');
    const { history } = await fetch({ query });

    this.setupHistoryKeywords(history);

    this.setState({
      hasFinishedFetch: true,
      hasReachedLastEntry: history.length < LIMIT,
      history,
      query,
    });
  }

  handleScroll = async (e) => {
    const bottom = e.target.scrollHeight - e.target.clientHeight - e.target.scrollTop;

    if (bottom === 0) {
      const { query, history, frameStartsAt } = this.state;

      // For infinite scroll we want to get the items from the 'past'.
      // That means we have to find the 'oldest' item in the current history list
      // and then query for all elements with visited timestamp LESS THAN the oldest one
      // which was returned by getFirstVisitedTime so far.
      // That is why we also subtract 1 from firstVisitedTime eventually.
      let firstVisitedTime = getFirstVisitedTime(history);

      // If firstVisitedTime equals 0 then history does not have a thing.
      // Nothing is to scroll.
      if (!firstVisitedTime) {
        return;
      }

      firstVisitedTime -= 1;
      if (frameStartsAt) {
        // frameStartsAt is a number.
        // That means any period except for 'All' is active.
        // Now we need to make sure that firstVisitedTime is greater than frameStartsAt
        // Otherwise the 'from' value might be greater than or equal to 'to' one.
        // Which would be irrelevant for display.
        // Technically there still might be some history items there but we should not
        // show them anyway in that case.
        if (firstVisitedTime <= frameStartsAt) {
          return;
        }
      }

      const moreHistory = await fetch({ from: frameStartsAt, to: firstVisitedTime, query });

      this.setState(prevState => ({
        hasFinishedFetch: true,
        hasReachedLastEntry: moreHistory.history.length < LIMIT,
        history: prevState.history.concat(moreHistory.history),
      }));
    }
  }

  handleSearchInputChange = (ev) => {
    const query = ev.target.value;
    clearTimeout(this.timeout);
    this.setState({ query });
    this.timeout = setTimeout(() => this.delayedFetch(query), 100);
  }

  delayedFetch = async (query) => {
    const { history } = await fetch({ query });

    this.setupHistoryKeywords(history);

    this.setState({
      hasFinishedFetch: true,
      hasReachedLastEntry: history.length < LIMIT,
      history,
    });
  }

  deleteVisit = ({ visitId }) => {
    const { history } = this.state;

    let i = 0;
    let sessionId = 0;
    while (history[i] != null) {
      const visit = history[i];

      if (visit.lastVisitedAt === visitId) {
        sessionId = visit.sessionId;
        history.splice(i, 1);
      } else {
        i += 1;
      }
    }

    cliqz.history.deleteVisit(visitId);

    this.setState({ history });

    const visibleSessionVisits = history.filter(
      visit => visit.sessionId === sessionId && visit.isVisible
    );
    if (!visibleSessionVisits.length) {
      this.deleteSession(sessionId);
    }
  }

  deleteSession = (sessionId) => {
    const { history } = this.state;

    const visitsToDelete = [];
    let i = 0;
    while (history[i] != null) {
      const visit = history[i];

      if (visit.sessionId === sessionId) {
        visitsToDelete.push(visit.lastVisitedAt);
        history.splice(i, 1);
      } else {
        i += 1;
      }
    }

    cliqz.history.deleteVisits(visitsToDelete);

    this.setState({ history });
  }

  changeActiveFilter = (frame, idx) => {
    // If idx equals 0 then it means we have selected 'ALL' for retrieving
    // all items limited by LIMIT from the History.
    // Both frameEndsAt and frameStartsAt have to be undefined in that case
    // as FF History API requires.
    const frameEndsAt = idx === 0 ? undefined : frame.frameEndsAt;
    const frameStartsAt = idx === 0 ? undefined : frame.frameStartsAt;

    this.setState({
      frameEndsAt,
      frameStartsAt,
      selectedBtn: idx,
    });
  }

  clearHistorySearch = () => {
    this.setState({ query: '' });
    // setState triggers render function which in turn shows history elements.
    // History elements are stored in state.
    // The number of them might be different depending on whether a user searched for
    // something on the page or not (displayed items come from the state).
    // To show the most relevant history items after a user cleared search input
    // we need to call delayedFetch again but with empty query just to call fetch
    // on its' own.
    // This will return all history results according to the period.
    this.delayedFetch('');
  }

  filterHistory = (history) => {
    const { frameEndsAt, frameStartsAt } = this.state;
    // frameStartsAt and frameEndsAt equaled to each other
    // means we are dealing with displaying all items from
    // the History.
    // So no need to filter out.
    // Just return a copy of the history list since we do not
    // want to modify the original one later on (clustreing and sessions).
    if (frameStartsAt === frameEndsAt) {
      return [...history];
    }

    return history.filter(visit => (
      (visit.lastVisitedAt <= frameEndsAt)
      && (visit.lastVisitedAt >= frameStartsAt)
    ));
  }

  handleVisitKeywordClick = (event, keyword, url) => {
    if (url && url.indexOf('https://cliqz.com') === 0) {
      event.preventDefault();
      cliqz.core.queryCliqz(keyword);
    }
  }

  showContent = () => {
    const { hasFinishedFetch, history, hasReachedLastEntry, query } = this.state;
    return hasFinishedFetch
      ? (
        <HistoryResults
          deleteSession={this.deleteSession}
          deleteVisit={this.deleteVisit}
          hasReachedLastEntry={hasReachedLastEntry}
          history={sortClusterSessionsFromRecentToOld(
            createClusterSessions(createHistoryCluster(this.filterHistory(history)))
          )}
          query={query}
          handleVisitKeywordClick={this.handleVisitKeywordClick}
        />
      )
      : <Preloader />;
  }

  render() {
    const { selectedBtn } = this.state;

    return (
      <div
        className="app"
        onScroll={this.handleScroll}
      >
        <Navigation urls={this.urls} />

        <Filters
          handleButtonClick={this.changeActiveFilter}
          selectedBtn={selectedBtn}
          sendUserFeedback={sendUserFeedback}
        />

        <section className="history-container">
          <TopBar
            clearHistorySearch={this.clearHistorySearch}
            handleSearchInputChange={this.handleSearchInputChange}
            inputValue={this.state.query}
            showHistoryDeletionPopup={this.showHistoryDeletionPopup}
          />

          {this.showContent()}
        </section>
      </div>
    );
  }
}
