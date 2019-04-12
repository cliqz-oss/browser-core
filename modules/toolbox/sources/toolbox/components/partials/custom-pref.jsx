import React from 'react';
import PropTypes from 'prop-types';

import Button from './button';
import NumericInput from './numeric-input';
import RadioInput from './radio-input';
import Row from './row';
import Switch from './switch';
import TableHeader from './table-header';
import TextInput from './text-input';

class CustomPref extends React.Component {
  state = {
    customPrefName: '',
    customPrefValue: '',
    customPrefType: 'string'
  }

  parseIntoNumber = (value) => {
    let parsedValue = value;

    if (typeof value === 'boolean') {
      return parsedValue ? 1 : 0;
    }

    parsedValue = parseInt(parsedValue, 10);
    return isNaN(parsedValue) ? 0 : parsedValue;
  }

  setCustomPref = () => {
    if (this.state.customPrefName === '') {
      this.setState({ customPrefName: 'Cannot be empty' });
    } else {
      this.props.setPref({
        name: this.state.customPrefName.toString(),
        value: this.state.customPrefValue,
      });
    }
  }

  renderInput = () => {
    if (this.state.customPrefType === 'number') {
      return (
        <NumericInput
          onNumberChange={value => this.setState({
            customPrefValue: this.parseIntoNumber(value)
          })}
          placeholder={`Value (${this.state.customPrefType})`}
          textInputValue={this.parseIntoNumber(this.state.customPrefValue)}
        />
      );
    }
    if (this.state.customPrefType === 'bool') {
      return (
        <Switch
          toggleComponent={ev => this.setState({
            customPrefValue: ev.target.checked
          })}
          isChecked={Boolean(this.state.customPrefValue)}
        />
      );
    }
    return (
      <TextInput
        onTextChange={value => this.setState({
          customPrefValue: value.toString()
        })}
        textInputValue={this.state.customPrefValue.toString()}
      />
    );
  }

  render() {
    return (
      <tbody>
        <TableHeader
          header="Set custom pref:"
        />

        <Row>
          <TextInput
            onTextChange={textValue => this.setState({
              customPrefName: textValue,
            })}
            placeholder="Name"
            textInputValue={this.state.customPrefName}
          />

          {this.renderInput()}

          <Button
            onClick={this.setCustomPref}
            value="SAVE CHANGES"
          />

        </Row>

        <Row>
          <label>
            <RadioInput
              isRadioChecked={this.state.customPrefType === 'string'}
              onRadioUpdate={() => this.setState({ customPrefType: 'string' })}
            />
            String
          </label>

          <label>
            <RadioInput
              isRadioChecked={this.state.customPrefType === 'number'}
              onRadioUpdate={() => this.setState({ customPrefType: 'number' })}
            />
            Number
          </label>

          <label>
            <RadioInput
              isRadioChecked={this.state.customPrefType === 'bool'}
              onRadioUpdate={() => this.setState({ customPrefType: 'bool' })}
            />
            Bool
          </label>
        </Row>
      </tbody>
    );
  }
}

CustomPref.propTypes = {
  setPref: PropTypes.func.isRequired,
};

export default CustomPref;
