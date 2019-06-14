import React from 'react';
import Overlay from '../overlay';
import Urlbar from './index';
import SearchSettings from './search-settings';
import cliqz from '../../cliqz';
import FreshtabDropdownManager from '../../../../dropdown/managers/freshtab';
import t from '../../i18n';
import Button from '../partials/button';

export default class UrlbarWithResults extends Urlbar {
  constructor(props) {
    super(props);
    this.dropdown = new FreshtabDropdownManager({
      view: this,
      cliqz,
    });

    this.actions = this.dropdown.actions;
    this.state = {
      ...this.state,
      isSearchSettingsOpen: false,
      iframeHeight: 0,
      isOverlayOpen: false,
    };
  }

  get classes() {
    return [
      super.classes,
      'with-results',
      this.state.iframeHeight !== 0 || this.state.isSearchSettingsOpen ? 'with-dropdown' : '',
    ].join(' ');
  }

  get maxHeight() {
    return window.innerHeight - 140;
  }

  get isDropdownOpen() {
    return this.state.iframeHeight !== 0;
  }

  get isSearchSettingsOpen() {
    return this.state.isSearchSettingsOpen;
  }

  handlePaste = (ev) => {
    // Dropdown saves 'keydown' 'paste', and 'drop' events for later use
    // that is why we should prevent React from reusing this object.
    ev.persist();
    this.dropdown.onPaste(ev);
  }

  handleKeyDown = (ev) => {
    ev.persist();
    if (this.dropdown.onKeydown(ev)) {
      ev.preventDefault();
    }
  }

  handleDrop = (ev) => {
    ev.persist();
    this.dropdown.onDrop(ev);
  }

  setHeight = (height) => {
    this.setState({
      iframeHeight: Math.min(this.maxHeight, height),
    });
  }

  handleKeyPress = (ev) => {
    if (this.dropdown.onKeyPress(ev)) {
      ev.preventDefault();
    }
  }

  handleInput = (ev) => {
    if (this.dropdown.onInput(ev)) {
      ev.preventDefault();
    }
  }

  componentDidUpdate() {
    const shouldShowOverlay = this.isSearchSettingsOpen
      || this.isDropdownOpen
      || (this.state.focused && this.textInput && !!this.textInput.value);

    if (shouldShowOverlay !== this.state.isOverlayOpen) {
      // this setState will not trigger infinite loop because it of the check above
      /* eslint-disable react/no-did-update-set-state */
      this.setState({
        isOverlayOpen: shouldShowOverlay
      });
      /* eslint-enable react/no-did-update-set-state */
    }
  }

  componentWillUnmount() {
    this.dropdown.unload();
  }

  createIframe = () => {
    if (this.dropdown.iframe) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.iframe.onload = () => {
        this.dropdown.createIframeWrapper(this.iframe);
        resolve();
      };
      this.iframe.src = '../dropdown/dropdown.html';
    });
  }

  handleFocus = async (ev) => {
    await this.createIframe();
    this.setState({
      focused: true,
    });

    this.dropdown.onFocus(ev);

    if (this.props.shouldShowReminder) {
      this.props.toggleComponent('searchReminder');
    }

    if (!this.dropdown.isOpen) {
      cliqz.freshtab.reportEvent({
        type: 'urlbar-focus',
      });
      if (this.textInput.value) {
        this.hideSettings();
        this.dropdown._queryCliqz(this.textInput.value);
      }
    }
  }

  handleBlur = (ev) => {
    this.dropdown.onBlur(ev);
  }

  toggleSettings = () => {
    if (this.isSearchSettingsOpen) {
      this.hideSettings();
    } else {
      this.showSettings();
    }
  }

  closeAll = () => {
    this.setHeight(0);
    this.hideSettings();
  }

  hideSettings = () => {
    this.setState({
      isSearchSettingsOpen: false,
    });
  }

  showSettings = () => {
    this.setState({
      isSearchSettingsOpen: true,
    });
  }

  render() {
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <div>
        <Overlay
          isOpen={this.state.isOverlayOpen}
          onClick={this.closeAll}
        />
        <div className="search-reminder">
          {this.props.shouldShowReminder
            && (
              <span>
                <span>
                  {t('search_reminder')}
                  <em>
                    &nbsp;{t('search_reminder_action')}
                  </em>
                </span>
                <span className="cliqz-close-btn" onClick={() => this.props.toggleComponent('searchReminder')} />
              </span>
            )
          }
        </div>
        {super.render()}
        <div className="inner-container">
          <Button
            className={`search-settings-btn ${this.state.isSearchSettingsOpen ? 'active' : ''}`}
            onClick={this.toggleSettings}
          />
          <div className="results">
            <div id="search-settings" className={`settings-panel ${(this.state.isSearchSettingsOpen ? 'show' : 'hide')}`}>
              <SearchSettings maxHeight={this.maxHeight} isOpen={this.state.isSearchSettingsOpen} />
            </div>
            <iframe
              id="cliqz-dropdown"
              tabIndex="-1"
              title="Results"
              ref={(iframe) => { this.iframe = iframe; }}
              className={`${(this.state.isSearchSettingsOpen ? 'hide' : 'show')}`}
              style={{ height: `${this.state.iframeHeight}px` }}
            />
          </div>
        </div>
      </div>
    );
  }
}
