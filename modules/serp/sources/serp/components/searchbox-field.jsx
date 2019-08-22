/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

export default class SearchboxField extends React.Component {
  constructor(props = {}) {
    super(props);

    this.propsHandleFocusEvent = typeof props.handleFocus === 'function'
      ? props.handleFocus
      : () => {};

    this.propsHandleBlurEvent = typeof props.handleBlur === 'function'
      ? props.handleBlur
      : () => {};

    this.handleKeyDown = typeof props.handleKeyDown === 'function'
      ? props.handleKeyDown
      : () => {};

    this.updateSearchboxValue = typeof props.updateSearchboxValue === 'function'
      ? props.updateSearchboxValue
      : () => {};

    this.cssClasses = props.cssClasses
      ? props.cssClasses
      : [];

    this.placeholder = props.placeholder
      ? props.placeholder
      : '';

    this.state = {
      value: props.value
        ? props.value
        : '',
    };

    this.shouldHaveFocus = props.shouldHaveFocus === true;
  }

  componentDidMount() {
    if (this.shouldHaveFocus) {
      this.element.focus();
    }

    this.element.addEventListener('focus', this.handleFocusEvent);
    this.element.addEventListener('blur', this.handleBlurEvent);
  }

  componentWillUnmount() {
    this.element.removeEventListener('focus', this.handleFocusEvent);
    this.element.removeEventListener('blur', this.handleBlurEvent);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.state.value) {
      this.setState({
        value: nextProps.value,
      });
    }

    if (typeof nextProps.shouldHaveFocus === 'boolean') {
      this.shouldHaveFocus = nextProps.shouldHaveFocus;
    }
  }

  handleFocusEvent = (event) => {
    this.propsHandleFocusEvent(event);
  }

  handleBlurEvent = (event) => {
    this.propsHandleBlurEvent(event);
  }

  handleChangeEvent = (event) => {
    const nextValue = event.target.value;

    this.setState({
      value: nextValue,
    });

    this.updateSearchboxValue(nextValue);
  }

  render() {
    return (
      <input
        id="searchbox"
        ref={(element) => { this.element = element; return true; }}
        type="text"
        className={['searchbox-field'].concat(this.cssClasses).join(' ')}
        placeholder={this.placeholder}
        spellCheck="false"
        value={this.state.value}
        onChange={this.handleChangeEvent}
        onKeyDown={this.handleKeyDown}
      />
    );
  }
}
