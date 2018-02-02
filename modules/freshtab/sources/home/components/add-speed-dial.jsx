import PropTypes from 'prop-types';
import React from 'react';
import ToggleDisplay from 'react-toggle-display';
import cliqz from '../cliqz';
import t from '../i18n';
import { favoriteAddSignal, addFormCloseSignal, addFormSubmitSignal } from '../services/telemetry/speed-dial';

const DEFAULT_STATE = Object.freeze({
  show: true,
  value: '',
  errorDuplicate: false,
  errorInValid: false
});

export default class AddSpeedDial extends React.Component {
  static get propTypes() {
    return {
      addSpeedDial: PropTypes.func,
    };
  }

  constructor(props) {
    super(props);
    this.freshtab = cliqz.freshtab;
    this.state = {
      ...DEFAULT_STATE,
    };

    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleClick(event) {
    event.preventDefault();
    if (this.state.show) {
      favoriteAddSignal();
      this.setState({
        ...DEFAULT_STATE,
      });
    } else {
      addFormCloseSignal();
    }

    this.setState({
      show: !this.state.show
    });
  }

  handleChange(event) {
    this.setState({ value: event.target.value });
  }

  handleSubmit(event) {
    event.preventDefault();
    addFormSubmitSignal();
    const url = this.input.value.trim();
    if (!url) {
      return;
    }

    this.freshtab.addSpeedDial(url, null).then((resp) => {
      if (resp.error) {
        if (resp.reason === 'duplicate') {
          this.setState({
            errorDuplicate: true
          });
        } else {
          this.setState({
            errorInValid: true
          });
        }
      } else {
        this.setState({
          value: ''
        });
        this.setState({
          show: !this.state.show
        });

        this.props.addSpeedDial(resp);
      }
    });
  }

  render() {
    return (
      <div className="dial dial-plus">
        <ToggleDisplay show={this.state.show}>
          <button className="plus-dial-icon" onClick={this.handleClick} />
        </ToggleDisplay>
        <ToggleDisplay hide={this.state.show}>
          <form
            name="addForm"
            className="addDialForm"
            onSubmit={this.handleSubmit}
          >
            <button
              className="hideAddForm"
              type="button"
              role="link"
              onClick={this.handleClick}
            />
            {
              this.state.errorDuplicate &&
                <div className="error">
                  {t('app.speed-dial.exists-already')}
                </div>
            }
            {
              this.state.errorInvalid &&
                <div className="error">
                  {t('app.speed-dial.not-valid')}
                </div>
            }
            <input
              name="addUrl"
              type="text"
              className="addUrl"
              placeholder={t('app.speed-dial.input.placeholder')}
              value={this.state.value}
              onChange={this.handleChange}
              ref={(el) => {
                // TODO: Fix me
                if (!el) {
                  return;
                }
                this.input = el;
                this.input.focus();
              }}
            />

            <button className="submit" type="submit">
              {t('app.speed-dial.add')}
            </button>
          </form>
        </ToggleDisplay>
      </div>
    );
  }
}
