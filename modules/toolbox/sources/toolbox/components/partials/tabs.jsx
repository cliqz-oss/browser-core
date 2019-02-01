import React from 'react';
import PropTypes from 'prop-types';

class Tabs extends React.Component {
  state = {
    selected: this.props.selected
  }

  handleClick = (event, index) => {
    event.preventDefault();
    this.setState({
      selected: index
    });
    this.props.syncState();
  }

  renderTitles = () => {
    const labels = (child, index) => {
      const activeClass = this.state.selected === index ? 'active' : '';
      return (
        <li
          key={index}
          className={`tab ${activeClass}`}
        >
          <input
            name="tabs"
            id={`tab-${index}`}
            type="radio"
            className="tab-input"
            onClick={ev => this.handleClick(ev, index)}
          />
          <label
            htmlFor={`tab-${index}`}
            className="tab-label"
          >
            {child.props.label}
          </label>
        </li>
      );
    };

    return (
      <ul className="tabs-labels">
        {this.props.children.map(labels)}
      </ul>
    );
  }

  renderContent = () =>
    (
      <div className="tabs-content">
        {this.props.children[this.state.selected]}
      </div>
    );

  render() {
    return (
      <div className="tabs">
        {this.renderTitles()}
        {this.renderContent()}
      </div>
    );
  }
}

Tabs.propTypes = {
  selected: PropTypes.number.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.element
  ]).isRequired,
};

export default Tabs;
