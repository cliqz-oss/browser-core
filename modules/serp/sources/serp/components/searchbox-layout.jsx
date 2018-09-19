import React from 'react';
import classNames from 'classnames';
import WhyCliqzBlock from './why-cliqz-block';
import HumanWebBlock from './human-web-block';
import renderQuerySuggestions from './variations/v2/dropdown-helper';
import renderSearchField from './searchbox-field-helper';
import t from '../services/i18n';
import renderSearchboxSubmitIcon from './searchbox-submit-icon-helper';

const renderPromoBlock = ({ shouldDisplayHumanWebBlock }) => {
  if (shouldDisplayHumanWebBlock) {
    return <HumanWebBlock text={t('human_web_promo')} />;
  }

  return <WhyCliqzBlock />;
};

export default (props = {}) => {
  const handleSubmitIconClick = typeof props.handleSubmitIconClick === 'function'
    ? props.handleSubmitIconClick
    : () => {};

  const handleKeyDown = props.handleKeyDown;
  const updateSearchboxValue = props.updateSearchboxValue;
  const query = props.query;
  const prevQuery = props.prevQuery;
  const querySuggestions = props.querySuggestions;
  const handleItemSuggestion = props.handleItemSuggestion;
  const handleItemSelection = props.handleItemSelection;
  const shouldDisplayQuerySuggestions = props.shouldDisplayQuerySuggestions;
  const shouldDisplayLookAndFeelV1 = props.shouldDisplayLookAndFeelV1;
  const shouldDisplayLookAndFeelV3 = props.shouldDisplayLookAndFeelV3;

  const searchboxLayoutCss = classNames({
    'searchbox-layout': true,
    'searchbox-v3-layout': shouldDisplayLookAndFeelV3,
  });

  const searchboxFieldLayoutClasses = classNames({
    'searchbox-v1-field-layout': shouldDisplayLookAndFeelV1,
    'searchbox-v3-field-layout': shouldDisplayLookAndFeelV3,
    'searchbox-v3-field-layout-main': shouldDisplayLookAndFeelV3,
  });

  const session = props.session;

  return (
    <div
      className={searchboxLayoutCss}
    >
      <div
        className="searchbox-container"
      >
        <div
          className="searchbox-logo"
        />
        <div
          className={searchboxFieldLayoutClasses}
          data-view="landing"
          data-session={session}
        >
          {
            renderSearchField({
              query,
              handleKeyDown,
              updateSearchboxValue,
              placeholder: t('search_with_cliqz'),
              shouldDisplayLookAndFeelV1,
              shouldDisplayLookAndFeelV3,
              view: 'main',
              shouldHaveFocus: true,
            })
          }
          {
            renderSearchboxSubmitIcon({
              handleSubmitIconClick,
              shouldDisplayLookAndFeelV1,
              shouldDisplayLookAndFeelV3,
              session,
              telemetryView: 'landing',
            })
          }
          {
            shouldDisplayQuerySuggestions && renderQuerySuggestions({
              items: querySuggestions,
              handleItemSuggestion,
              handleItemSelection,
              pattern: prevQuery,
              cssClasses: ['dropdown-v2-main'],
            })
          }
        </div>
        {renderPromoBlock({ shouldDisplayHumanWebBlock: shouldDisplayLookAndFeelV3 })}
      </div>
    </div>
  );
};
