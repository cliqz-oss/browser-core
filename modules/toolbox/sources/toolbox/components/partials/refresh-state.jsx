import React from 'react';
import PropTypes from 'prop-types';

import Button from './button';
import Row from './row';

function RefreshState({
  refreshButtonValue,
  syncState
}) {
  return (
    <Row>
      <Button
        onClick={syncState}
        value={refreshButtonValue}
      />
    </Row>
  );
}

RefreshState.propTypes = {
  refreshButtonValue: PropTypes.string,
  syncState: PropTypes.func.isRequired,
};

RefreshState.defaultProps = {
  refreshButtonValue: 'REFRESH STATE',
};

export default RefreshState;
