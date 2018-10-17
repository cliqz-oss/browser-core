import React from 'react';

export default class SearchboxField extends React.Component {
  constructor(props = {}) {
    super(props);

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
      shouldHaveFocus: false,
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
