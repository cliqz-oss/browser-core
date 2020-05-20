import React from 'react';
import { css } from '../utils';

const _css = css('widgets-bulleted-list__');
export default class BulletedList extends React.Component {
  /* eslint-disable react/static-property-placement */
  static defaultProps = {
    marker: '✓',
    content: '',
    onChangeSize: () => {},
    maxLetters: 80,
    openBullets: 0,
    title: '',
    showMoreLabel: 'show-more-label',
    styles: {},
  }
  /* eslint-enable react/static-property-placement */

  state = {
    collapsed: true
  }

  _getBullets() {
    const { openBullets, content, marker } = this.props;
    const { collapsed } = this.state;
    const bullets = content.split(marker).filter(Boolean);
    const shouldShowMore = bullets.length > openBullets && collapsed;
    const newBullets = shouldShowMore ? bullets.slice(0, openBullets) : bullets;
    return [newBullets, shouldShowMore];
  }

  _getText() {
    const { content, maxLetters } = this.props;
    const { collapsed } = this.state;
    const shouldShowMore = content.length >= maxLetters && collapsed;
    const newContent = shouldShowMore ? `${content.substr(0, maxLetters)}...` : content;
    return [newContent, shouldShowMore];
  }

  _getContent() { // -> [boolean, string | string[], boolean]
    const areBullets = this.props.content.indexOf(this.props.marker) !== -1;
    return areBullets ? [true, ...this._getBullets()] : [false, ...this._getText()];
  }

  renderShowMore(Tag = props => <div {...props} />) {
    const { showMoreLabel } = this.props;
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
    return (
      <Tag
        className={_css('show-more')}
        onClick={() => this.setState({ collapsed: false }, this.props.onChangeSize)}
      >
        {showMoreLabel}&nbsp;
        <div className={_css('small-triangle')} />
      </Tag>
    );
    /* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
  }

  renderTitle() {
    const { title, openBullets } = this.props;
    if (openBullets !== 0) {
      return (
        <span className={_css('content-title', 'cursor-default')}>
          {title}&nbsp;
        </span>
      );
    }

    const { collapsed } = this.state;
    const rotatedCls = !collapsed ? 'small-triangle-rotated' : '';
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <span
        onClick={() => this.setState({ collapsed: !collapsed }, this.props.onChangeSize)}
        className={_css('content-title')}
      >
        {title}&nbsp;
        <div className={_css('small-triangle', rotatedCls)} />
      </span>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }

  renderBullets(bullets, shouldShowMore) {
    const { openBullets } = this.props;
    const _shouldShowMore = shouldShowMore && (openBullets !== 0);
    /* eslint-disable react/no-array-index-key */
    return (
      <React.Fragment>
        {this.renderTitle()}
        <ul className={_css('bullets')}>
          {bullets.map((text, i) => <li key={i} className={_css('bullet')}>{text}</li>)}
          {_shouldShowMore && this.renderShowMore(props => <li {...props} />)}
        </ul>
      </React.Fragment>
    );
    /* eslint-enable react/no-array-index-key */
  }

  renderText(content, shouldShowMore) {
    return (
      <React.Fragment>
        <span className={_css('text')}>
          {content}
        </span>
        {shouldShowMore && this.renderShowMore()}
      </React.Fragment>
    );
  }

  render() {
    const [areBullets, content, shouldShowMore] = this._getContent();
    return areBullets
      ? this.renderBullets(content, shouldShowMore)
      : this.renderText(content, shouldShowMore);
  }
}
