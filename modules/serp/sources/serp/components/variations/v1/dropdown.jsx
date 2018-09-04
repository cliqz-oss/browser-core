import React from 'react';
import classNames from 'classnames';

export default class Dropdown extends React.Component {
  constructor(props = {}) {
    super(props);

    this.onCancelHandler = typeof props.onCancelHandler === 'function'
      ? props.onCancelHandler
      : () => {};
    this.onSubmitHandler = typeof props.onSubmitHandler === 'function'
      ? props.onSubmitHandler
      : () => {};
    this.headerText = props.headerText || '';
    this.cancelButtonText = props.cancelButtonText || 'No';
    this.submitButtonText = props.submitButtonText || 'Yes';

    this.items = props.items || [];

    let selectedIndex = -1;
    for (let i = 0, l = this.items.length; i < l; i += 1) {
      if (this.items[i].checked) {
        selectedIndex = i;
        break;
      }
    }

    this.state = {
      selectedIndex,
    };
  }

  _handleItemClick = (event, newIndex) => {
    event.preventDefault();
    event.stopPropagation();

    this.setState({
      selectedIndex: newIndex,
    });
  }

  _handleSubmitClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    this.onSubmitHandler(event, this.state.selectedIndex);
  }

  _handleCancelClick = (event) => {
    this.onCancelHandler(event);
  }

  render() {
    return (
      <div
        className="dropdown-v1"
      >
        <div
          className="dropdown-v1-header"
        >
          {this.headerText}
          <button
            className="dropdown-v1-close"
            onClick={this._handleCancelClick}
          />
        </div>
        <div
          className="dropdown-v1-options"
        >
          {
            this.items.map((item, index) => {
              const cssClass = {
                'dropdown-v1-option': true,
                'dropdown-v1-option-checked': index === this.state.selectedIndex,
              };
              cssClass[item.cssClass] = !!item.cssClass;

              return (
                <div
                  key={item.title}
                >
                  <a
                    href=""
                    className={classNames(cssClass)}
                    onClick={
                      event => this._handleItemClick(event, index)
                    }
                  >
                    {item.title}
                  </a>
                </div>
              );
            })
          }
        </div>
        <div
          className="dropdown-v1-ctrls"
        >
          <button
            className="dropdown-v1-ctrl dropdown-v1-cancel"
            type="button"
            onClick={this._handleCancelClick}
          >
            {this.cancelButtonText}
          </button>
          <button
            className="dropdown-v1-ctrl dropdown-v1-submit"
            type="button"
            onClick={this._handleSubmitClick}
          >
            {this.submitButtonText}
          </button>
        </div>
      </div>
    );
  }
}

