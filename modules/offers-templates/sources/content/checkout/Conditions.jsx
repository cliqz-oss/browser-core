import React from 'react';
import { css, i18n } from '../utils';

const CONDITIONS_STYLE_MARKER = '✓';

const _css = css('conditions__');
export default class Conditions extends React.Component {
  state = {
    shouldRenderShowMore: true,
  }

  _getStyledConditions(conditions) {
    const { shouldRenderShowMore } = this.state;
    const maxCollapsedBullets = 2;
    const bullets = conditions.split(CONDITIONS_STYLE_MARKER).filter(Boolean);
    const shouldShowMore = bullets.length > maxCollapsedBullets && shouldRenderShowMore;
    const newConditions = shouldShowMore
      ? bullets.slice(0, maxCollapsedBullets)
      : bullets;
    return [newConditions, shouldShowMore];
  }

  _getCommonConditions(conditions) {
    const { shouldRenderShowMore } = this.state;
    const maxLetters = 80;
    const shouldShowMore = conditions.length >= maxLetters && shouldRenderShowMore;
    const newConditions = shouldShowMore
      ? `${conditions.substr(0, maxLetters)}...`
      : conditions;
    return [newConditions, shouldShowMore];
  }

  _getConditions() { // -> [boolean, string | string[], boolean]
    const { conditions = '' } = this.props.voucher;
    const isStyled = conditions.indexOf(CONDITIONS_STYLE_MARKER) !== -1;
    return isStyled
      ? [true, ...this._getStyledConditions(conditions)]
      : [false, ...this._getCommonConditions(conditions)];
  }

  renderStyledConditions(conditions, shouldShowMore) {
    /* eslint-disable react/no-array-index-key */
    return (
      <ul className={_css('bullets')}>
        {conditions.map((text, i) => <li key={i} className={_css('bullet')}>{text}</li>)}
        {shouldShowMore && this.renderShowMore(props => <li {...props} />)}
      </ul>
    );
    /* eslint-enable react/no-array-index-key */
  }

  renderCommonConditions(conditions, shouldShowMore) {
    return (
      <React.Fragment>
        <div className={_css('text')}>{conditions}</div>
        {shouldShowMore && this.renderShowMore()}
      </React.Fragment>
    );
  }

  renderShowMore(Tag = props => <div {...props} />) {
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
    return (
      <Tag
        className={_css('show-more')}
        onClick={() => this.setState({ shouldRenderShowMore: false })}
      >
        {i18n('show_more')}&nbsp;
        <span className={_css('small-triangle')}>&#9660;</span>
      </Tag>
    );
    /* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
  }

  render() {
    const [isStyled, conditions, shouldShowMore] = this._getConditions();
    return (
      <React.Fragment>
        {isStyled && <div className={_css('title')}>{i18n('check_conditions')}:</div>}
        {isStyled && this.renderStyledConditions(conditions, shouldShowMore)}
        {!isStyled && this.renderCommonConditions(conditions, shouldShowMore)}
      </React.Fragment>
    );
  }
}
