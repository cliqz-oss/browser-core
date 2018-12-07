import React from 'react';
import classNames from 'classnames';

const KEY_ARROW_UP = 38;
const KEY_ARROW_DOWN = 40;
const KEY_ENTER = 13;

const findIntersection = (pattern = '', string = '') => {
  // by default there are no intersections;
  let start = -1;
  let end = -1;

  let patternPointer = 0;
  let stringPointer = 0;
  const l = pattern.length;
  while (patternPointer < l) {
    if (pattern[patternPointer] !== string[stringPointer]) {
      stringPointer += 1;
      patternPointer += 1;
    } else {
      start = stringPointer;
      break;
    }
  }

  if (start === -1) {
    return [-1, -1];
  }

  while (patternPointer < l) {
    if (pattern[patternPointer] === string[stringPointer]) {
      stringPointer += 1;
      patternPointer += 1;
    } else {
      break;
    }
  }
  end = stringPointer;

  return [start, end];
};

export default class Dropdown extends React.Component {
  constructor(props) {
    super(props);

    this.handleItemSelection = typeof props.handleItemSelection === 'function'
      ? props.handleItemSelection
      : () => {};

    this.handleItemSuggestion = typeof props.handleItemSuggestion === 'function'
      ? props.handleItemSuggestion
      : () => {};

    this.cssClasses = props.cssClasses
      ? props.cssClasses
      : [];

    this._session = props.session;

    this.state = {
      selectedIndex: -1,
      items: props.items || [],
      pattern: props.pattern || '',
    };

    document.addEventListener('click', this.onClickHandler);
    document.addEventListener('keydown', this.onKeyDownHandler);
  }

  componentWillReceiveProps(nextProps) {
    const nextState = {
      items: nextProps.items,
      pattern: nextProps.pattern || '',
    };

    if (typeof nextProps.selectedIndex === 'number'
      && !isNaN(nextProps.selectedIndex)
      && nextProps.selectedIndex !== this.state.selectedIndex) {
      nextState.selectedIndex = nextProps.selectedIndex;
    }

    if (nextProps.session !== this._session) {
      this._session = nextProps.session;
    }

    this.setState(nextState);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onClickHandler);
    document.removeEventListener('keydown', this.onKeyDownHandler);
  }

  onClickHandler = () => {
    this.setState({
      selectedIndex: -1,
    });
  }

  onKeyDownHandler = (event) => {
    const keyCode = event.keyCode;
    const items = this.state.items;

    if (keyCode === KEY_ARROW_UP || keyCode === KEY_ARROW_DOWN) {
      event.preventDefault();
      let nextSelectedIndex;

      if (keyCode === KEY_ARROW_UP) {
        nextSelectedIndex = this.state.selectedIndex - 1;
      } else {
        nextSelectedIndex = this.state.selectedIndex + 1;
      }

      if (nextSelectedIndex < 0) {
        nextSelectedIndex = items.length - 1;
      } else if (nextSelectedIndex >= items.length) {
        nextSelectedIndex = 0;
      }

      this.setState({
        selectedIndex: nextSelectedIndex,
      });

      this.handleItemSuggestion(items[nextSelectedIndex]);
    } else if (keyCode === KEY_ENTER) {
      this.handleItemSelection(event, items[this.state.selectedIndex]);
    }
  }

  onMouseEnterHandler = (event, index) => {
    this.setState({
      selectedIndex: index
    });
  }

  onMouseLeaveHandler = () => {
    this.setState({
      selectedIndex: -1
    });
  }

  renderTitle(item, pattern) {
    let title = item.title;
    const intersection = findIntersection(pattern, title);

    if (intersection[0] !== -1) {
      const titleSeparator = title.slice(intersection[0], intersection[1]);
      title = title.split(titleSeparator);

      return (
        <span>
          <strong>{title[0]}</strong>
          {titleSeparator}
          <strong>{title[1]}</strong>
        </span>
      );
    }
    return item.title;
  }

  renderDropdownOption(item, index) {
    const cssClass = {
      'dropdown-v2-option': true,
      'dropdown-v2-option-selected': index === this.state.selectedIndex,
    };
    const items = this.state.items;
    const pattern = this.state.pattern;

    return (
      <a
        href={`#${item.title}`}
        key={item.title}
        className={classNames(cssClass)}
        onMouseDown={
          event => this.handleItemSelection(event, items[index])
        }
        onMouseEnter={
          event => this.onMouseEnterHandler(event, index)
        }
        onMouseLeave={
          event => this.onMouseLeaveHandler(event, index)
        }
        data-idx={index}
        data-telemetry="suggestion"
        data-session={this._session}
      >
        {this.renderTitle(item, pattern)}
      </a>
    );
  }

  render() {
    const items = this.state.items;
    const cssClasses = ['dropdown-v2'].concat(this.cssClasses);

    return (
      <div
        className={cssClasses.join(' ')}
      >
        <div
          className="dropdown-v2-options"
        >
          {
            items.map((item, index) =>
              this.renderDropdownOption(item, index))
          }
        </div>
      </div>
    );
  }
}
