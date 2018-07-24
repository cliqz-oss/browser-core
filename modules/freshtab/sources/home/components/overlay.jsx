import React from 'react';

function Overlay(props) {
  return (
    <div
      id="overlay"
      className={props.isOpen ? 'open' : ''}
    />
  );
}

export default Overlay;

