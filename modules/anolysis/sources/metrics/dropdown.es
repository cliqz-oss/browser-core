
// TODO - adapt to new mixer (@dominik)
function mkResultSelectionSchema(name) {
  return {
    name,
    schema: {
      properties: {
        current_position: { type: 'string', minimum: 0 },
        query_length: { type: 'number', minimum: 0 },
        reaction_time: { type: 'number', minimum: 0 },
        display_time: { type: 'number', minimum: 0 },
        urlbar_time: { type: 'number', minimum: 0 },
      },
    },
  };
}

export default [
  ...[
    'result_selection_click',
    'result_selection_autocomplete',
    'result_selection_enter',
    'result_selection_query',
    'result_selection_url',
  ].map(mkResultSelectionSchema),
];
