/*
 * SecVM experiment
 * Valentin Hartmann, Robert West - EPFL
 * Author: Valentin Hartmann
*/

const DatabaseEnum = {
  HASHED_FEATURE_VECTORS: 0,
  DICE_ROLLS: 1,
  LABEL_SET: 2,
  properties: {
    0: { name: 'hashed_feature_vectors', tuple_first: 'id', tuple_second: 'vector' },
    1: { name: 'dice_rolls', tuple_first: 'id', tuple_second: 'result' },
    2: { name: 'label_set', tuple_first: 'property', tuple_second: 'value' }
  }
};

export default DatabaseEnum;
