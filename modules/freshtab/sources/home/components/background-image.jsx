import React from 'react';
import PropTypes from 'prop-types';
import AppContext from './app-context';

export default function BackgroundImage({
  bg,
  index,
  isActive,
  onBackgroundImageChanged,
  src,
}) {
  const selectBackground = (product) => {
    onBackgroundImageChanged(bg, index, product);
  };

  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <AppContext.Consumer>
      {
        ({ config }) => (
          <div onClick={() => selectBackground(config.product)}>
            <img
              alt=""
              data-bg={bg}
              width="71"
              src={src}
              className={isActive ? 'active' : ''}
            />
            <span className="selected-img">
              <img
                alt=""
                src="./images/bg-check.svg"
              />
            </span>
          </div>
        )
      }
    </AppContext.Consumer>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}

BackgroundImage.propTypes = {
  bg: PropTypes.string,
  isActive: PropTypes.bool,
  index: PropTypes.number,
  onBackgroundImageChanged: PropTypes.func,
  src: PropTypes.string,
};
