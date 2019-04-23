import React from 'react';
import { css, i18n } from '../common/utils';

/* eslint-disable  jsx-a11y/no-static-element-interactions */
const _css = css('card-conditions__');
export default class Conditions extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mouseInside: false,
    };
  }

  render() {
    const { mouseInside } = this.state;
    const { voucher = {}, active, onClick, products } = this.props;
    const {
      validity: { text = '', isExpiredSoon = false } = {},
      template_data: templateData,
    } = voucher;

    const isActive = active || mouseInside;
    const prefix = products.chip ? 'chip' : 'myoffrz';
    return (
      <div className={_css('container')}>
        <div
          className={_css('till', isExpiredSoon ? `${prefix}-red-label` : '')}
        >
          {text}
        </div>
        {templateData.conditions && (
          <div
            onClick={onClick}
            onMouseEnter={() => this.setState({ mouseInside: true })}
            onMouseLeave={() => this.setState({ mouseInside: false })}
            className={_css('right-item')}
          >
            <div className={_css('label', `label-${isActive ? 'active' : 'default'}`)}>
              {i18n('offers_conditions')}
            </div>
            <div className={_css('icon', `icon-${isActive ? `${prefix}-active` : 'default'}`)} />
          </div>
        )}
      </div>
    );
  }
}
