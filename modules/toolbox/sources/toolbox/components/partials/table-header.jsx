import React from 'react';
import PropTypes from 'prop-types';

function TableHeader({
  header,
}) {
  return (
    <tr>
      <th colSpan="100%">
        {header}
      </th>
    </tr>
  );
}

TableHeader.propTypes = {
  header: PropTypes.string.isRequired,
};

export default TableHeader;
