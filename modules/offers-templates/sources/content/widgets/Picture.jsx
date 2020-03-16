import React from 'react';
import { sendThroughRuntime } from '../transport';
import { css } from '../utils';

const _css = css('widgets-picture__');
export default class Picture extends React.Component {
  /* eslint-disable react/static-property-placement */
  static defaultProps = {
    url: '',
    dataurl: '',
    width: '83px',
    height: '34px',
    notification: '',
    styles: {},
    onLoadImage: () => {},
  }
  /* eslint-enable react/static-property-placement */

  componentDidMount() {
    if (this.props.dataurl || !this.props.url) { return; }
    const response = data => this.props.onLoadImage(data.dataurl);
    sendThroughRuntime('getImageAsDataurl', { url: this.props.url }, response);
  }

  renderImage() {
    const { notification, dataurl } = this.props;
    if (!dataurl) { return null; }
    return (
      <React.Fragment>
        {notification && <div className={_css('notification')}>{notification}</div>}
        <div
          className={_css('image')}
          style={{ backgroundImage: `url(${dataurl})` }}
        />
      </React.Fragment>
    );
  }

  render() {
    const { width, height, styles } = this.props;
    return (
      <div
        style={{ ...styles, width, height }}
        className={_css('wrapper')}
      >
        {this.renderImage()}
      </div>
    );
  }
}
