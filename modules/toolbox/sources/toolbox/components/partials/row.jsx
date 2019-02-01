import React from 'react';
import PropTypes from 'prop-types';

function Row({ children, idxOfChildToSpan }) {
  return (
    <tr>
      {React.Children.map(children, (child, idx) =>
        (
          ((typeof idxOfChildToSpan === 'number') && (idx === idxOfChildToSpan))
            ? <td colSpan="2">{child}</td>
            : <td>{child}</td>
        ))}
    </tr>
  );
}

Row.propTypes = {
  idxOfChildToSpan: PropTypes.number,
};

export default Row;
