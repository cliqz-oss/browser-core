import React from 'react';
import PropTypes from 'prop-types';

import Button from './button';
import Row from './row';

class HumanWebCheck extends React.Component {
  state = {
    isExpanded: false,
  }

  get parsedValue() {
    return JSON.stringify(this.props.currentValue, null, 2);
  }

  get isLongObject() {
    return this.parsedValue.length > 200;
  }

  onButtonClick = () => {
    this.setState(prevState => ({ isExpanded: !prevState.isExpanded }));
  }

  renderCurrentValue = () => {
    if (!this.state.isExpanded && this.isLongObject) {
      return `${this.parsedValue.slice(0, 200)}\n...`;
    }
    return this.parsedValue;
  };

  render() {
    return (
      <Row>
        <div>
          {this.props.name}
          <br />
          {this.isLongObject
            && (
              <Button
                onClick={this.onButtonClick}
                value="SHOW / HIDE"
              />
            )
          }
        </div>
        <div>
          <pre>{this.renderCurrentValue()}</pre>
        </div>
      </Row>
    );
  }
}

HumanWebCheck.propTypes = {
  currentValue: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.bool,
    PropTypes.number,
    PropTypes.object,
    PropTypes.string
  ]),
  name: PropTypes.string.isRequired,
};

HumanWebCheck.defaultProps = {
  currentValue: '',
};

export default HumanWebCheck;
