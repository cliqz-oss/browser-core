import React from 'react';
import PropTypes from 'prop-types';

import Visit from './visit';

const Session = ({ deleteVisit, visits, query, handleVisitKeywordClick }) => {
  const generateVisit = visibleVisits => visibleVisits.map((visit, idx) => (
    <Visit
      deleteVisit={deleteVisit}
      isFirst={idx === 0}
      key={`${visit.lastVisitedAt + idx}`}
      visit={visit}
      handleVisitKeywordClick={handleVisitKeywordClick}
      query={query}
    />
  ));

  const visibleVisits = visits.filter(item => item.isVisible);
  if (!visibleVisits.length) {
    return null;
  }

  return (
    <article className="session">
      {generateVisit(visibleVisits)}
    </article>
  );
};

Session.propTypes = {
  deleteVisit: PropTypes.func.isRequired,
  visits: PropTypes.array.isRequired,
  handleVisitKeywordClick: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
};

export default Session;
