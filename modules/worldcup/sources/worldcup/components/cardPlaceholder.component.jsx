import React from 'react';

const MAX_RESULTS = 4;

function PlaceHolder(props) {
  const data = props.data;
  const num = MAX_RESULTS - (data && data.length) || 0;
  const arr = new Array(Math.max(num, 0));
  return (
    <div>
      {
        arr.fill('').map(() =>
          (
            <div className="game_unit place_holder" />
          )
        )
      }
    </div>
  );
}

export default PlaceHolder;
