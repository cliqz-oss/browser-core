import React from 'react';
import PropTypes from 'prop-types';

function TableHeader({
  header,
}) {
  return (
    <tr>
      <th colSpan="2">
        {header}
      </th>
    </tr>
  );
}

TableHeader.propTypes = {
  header: PropTypes.string.isRequired,
};

export default TableHeader;
