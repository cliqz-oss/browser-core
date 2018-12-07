import React from 'react';
import Dropdown from './dropdown';

export default ({
  items,
  handleItemSelection,
  handleItemSuggestion,
  pattern,
  cssClasses,
  session,
}) => {
  if (!items.length) {
    return null;
  }

  return (
    <Dropdown
      items={items}
      handleItemSuggestion={handleItemSuggestion}
      handleItemSelection={handleItemSelection}
      pattern={pattern}
      cssClasses={cssClasses}
      session={session}
    />
  );
};
