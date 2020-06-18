import React from 'react';
import PropTypes from 'prop-types';
import t from '../i18n';

export default class BackgroundCustomImage extends React.Component {
  uploadCustomBackgroundImage = () => {
    this.props.onCustomBackgroundImageUploaded(this.input.files[0]);
  }

  render() {
    return (
      <div className="custom-background">
        <input
          type="file"
          id="custom-bg-input"
          accept="image/*"
          ref={(input) => { this.input = input; }}
          onChange={this.uploadCustomBackgroundImage}
        />
        <label htmlFor="custom-bg-input" className="link">{t('app_settings_custom_background_link')}</label>
      </div>
    );
  }
}

BackgroundCustomImage.propTypes = {
  onCustomBackgroundImageUploaded: PropTypes.func,
};
