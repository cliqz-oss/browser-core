import React from 'react';
import PropTypes from 'prop-types';

import t from '../../i18n';
import { getFrames } from '../../../core/helpers/date';

import Feedback from './partials/feedback';

const allFilters = [
  { name: 'day_selection_all', frame: { frameStartsAt: undefined, frameEndsAt: undefined } },
  { name: 'day_selection_today', frame: { ...getFrames().today } },
  { name: 'day_selection_yesterday', frame: { ...getFrames().yesterday } },
  { name: 'day_selection_pastweek', frame: { ...getFrames().lastWeek } },
];

const Filters = ({
  handleButtonClick,
  selectedBtn,
  sendUserFeedback,
}) => {
  const getActiveClassName = idx => (idx === selectedBtn ? 'active' : '');

  return (
    <section className="filters-container">
      <header className="header">
        {t('history_title')}
        <span className="beta">β</span>
      </header>

      <section className="button-container">
        {allFilters.map((btn, idx) => (
          <button
            className={`filter-btn ${getActiveClassName(idx)}`}
            key={btn.name}
            onClick={() => handleButtonClick(btn.frame, idx)}
            type="button"
          >
            {t(btn.name)}
          </button>
        ))}
      </section>

      <Feedback
        sendUserFeedback={sendUserFeedback}
      />
    </section>
  );
};

Filters.propTypes = {
  handleButtonClick: PropTypes.func.isRequired,
  selectedBtn: PropTypes.number.isRequired,
  sendUserFeedback: PropTypes.func.isRequired,
};

export default Filters;
