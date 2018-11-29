function getSelectionType(signal) {
  const positionType = (signal.position_type || [''])[0];
  if (positionType === 'inbar_url') {
    if (signal.source || signal.autocompleted) {
      return 'autocomplete';
    }
    return 'url';
  }
  if (positionType === 'inbar_query') {
    return 'query';
  }
  return 'enter';
}

// TODO: keys need to be updated if getId() function in preprocessor changes
const preprocessors = {
  'activity.result_click': signal => ({
    type: 'result_selection_click',
    behavior: {
      current_position: signal.current_position,
      query_length: signal.query_length,
      reaction_time: signal.reaction_time,
      display_time: signal.display_time,
      urlbar_time: signal.urlbar_time,
    },
  }),
  'activity.result_enter': signal => ({
    type: `result_selection_${getSelectionType(signal)}`,
    behavior: {
      current_position: signal.current_position,
      query_length: signal.query_length,
      reaction_time: signal.reaction_time,
      display_time: signal.display_time,
      urlbar_time: signal.urlbar_time,
    },
  }),
};

export default preprocessors;
