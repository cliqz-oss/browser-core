import React from 'react';
import PropTypes from 'prop-types';

export default class Overlay extends React.Component {
  componentDidUpdate(prevProps) {
    if (prevProps.isOpen !== this.props.isOpen) {
      document.body.classList[this.props.isOpen ? 'add' : 'remove']('show-overlay');
    }
  }

  get classes() {
    return [
      'overlay',
      this.props.isOpen ? 'open' : '',
    ].join(' ');
  }

  render() {
    return (
      <div
        id="overlay"
        role="presentation"
        className={this.classes}
        onClick={this.props.onClick}
      />
    );
  }
}

Overlay.propTypes = {
  isOpen: PropTypes.bool,
  onClick: PropTypes.func,
};
