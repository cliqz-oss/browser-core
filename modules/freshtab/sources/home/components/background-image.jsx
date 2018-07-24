import React from 'react';
import PropTypes from 'prop-types';

export default class BackgroundImage extends React.Component {
  constructor(props) {
    super(props);

    this.selectBackground = this.selectBackground.bind(this);
  }

  selectBackground() {
    this.props.onBackgroundImageChanged(this.props.bg, this.props.index);
  }

  render() {
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <div onClick={this.selectBackground}>
        <img
          alt=""
          data-bg={this.props.bg}
          width="71"
          src={this.props.src}
          className={this.props.isActive ? 'active' : ''}
        />
        <span className="selected-img">
          <img
            alt=""
            src="./images/bg-check.svg"
          />
        </span>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}

BackgroundImage.propTypes = {
  isActive: PropTypes.bool,
  bg: PropTypes.string,
  src: PropTypes.string,
  onBackgroundImageChanged: PropTypes.func,
};
