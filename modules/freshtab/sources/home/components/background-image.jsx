import React from 'react';
import PropTypes from 'prop-types';

export default class BackgroundImage extends React.Component {
  constructor(props) {
    super(props);

    this.selectBackground = this.selectBackground.bind(this);
  }

  selectBackground() {
    this.props.onBackgroundImageChanged(this.props.bg);
  }

  render() {
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <img
        role="presentation"
        onClick={this.selectBackground}
        data-bg={this.props.bg}
        width="71"
        src={this.props.src}
        className={this.props.isActive ? 'active' : ''}
      />
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}

BackgroundImage.propTypes = {
  isActive: PropTypes.boolean,
  bg: PropTypes.string,
  src: PropTypes.string,
  onBackgroundImageChanged: PropTypes.func,
};
