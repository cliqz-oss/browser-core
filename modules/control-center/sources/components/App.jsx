/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* global  $ */

import React from 'react';
import createModuleWrapper from '../../core/helpers/action-module-wrapper';

import Header from './Header';
import Antitracking from './Antitracking';
import Autoconsent from './Autoconsent';
import AdBlock from './Adblock';
import Antiphishing from './Antiphishing';
import Https from './Https';
import Support from './Support';
import Settings from './Settings';
import Offrz from './Offrz';
import CliqzTab from './CliqzTab';
import AntitrackingDetails from './AntitrackingDetails';
import AdblockDetails from './AdblockDetails';

const controlCenter = createModuleWrapper('control-center');
const isPrivateMode = !!(chrome && chrome.extension && chrome.extension.inIncognitoContext);

function getSearchParam(param) {
  const URLSearchParams = window.URLSearchParams;
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(param);
}

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: {},
      at: '',
      dropdown: {
        at: false,
        adb: false,
        ap: false,
        ac: false
      },
      showDetails: {
        at: false,
        adb: false,
        settings: false,
        offrz: false
      },
    };
  }

  componentDidMount() {
    controlCenter.getData().then((data) => {
      const isCompactView = getSearchParam('compactView');
      const at = (data.module && data.module.antitracking && data.module.antitracking.visible && data.module.antitracking.state) || 'active';
      this.setState({
        data: {
          ...data,
          compactView: !!isCompactView,
        },
        at,
      }, () => {
        $('.cc-tooltip').tooltipster({
          theme: ['tooltipster-shadow', 'tooltipster-shadow-customized'],
          animationDuration: 150,
        });
      });

      // remove the loader div once the content is populated
      if (document.getElementById('loader')) document.getElementById('loader').remove();
      window.postMessage('{ "ready": true }', '*');
    });
  }

  localize = (key, args) => chrome.i18n.getMessage(key, args);

  checkSafe = () => (this.state.at === 'active');

  setSafe = (receiver, msg) => {
    const { status } = msg;
    let mod = '';
    if (receiver !== 'antitracking-activator') {
      return Promise.resolve();
    }
    mod = 'at';
    return new Promise(resolve => this.setState({ [mod]: status }, resolve));
  }

  sendMessage = async (receiver, msg, isHost = true) => {
    const args = {
      ...msg,
      isPrivateMode,
    };
    if (isHost) {
      args.hostname = this.state.data.hostname;
    }
    controlCenter[receiver](args);
    await this.setSafe(receiver, msg);
    controlCenter.updateState(this.state.at);
  }

  toggleDropDown = (mode, mod, event) => {
    const { dropdown } = this.state;
    const openModule = Object.keys(dropdown).find(m => dropdown[m]);
    if (!openModule && !mode) return;
    if (
      event
      && event.target
      && (event.target.getAttribute('data-role') === 'dropdown')
    ) return;

    const newDropdown = {
      at: false,
      adb: false,
      ap: false,
      ac: false
    };
    if (mode && openModule !== mod) newDropdown[mod] = true;

    this.setState({ dropdown: newDropdown });
  }

  openUrl = (url, closePopup = true, target = null) => {
    const arg = {
      isPrivateMode,
      url,
      closePopup
    };
    if (target) arg.target = target;
    controlCenter.openURL(arg);
  }

  dataFunction = (fn, status, target = null) => {
    controlCenter[fn]({
      isPrivateMode,
      status,
      target
    });
  };

  toggleDetails = (value, mod) => {
    const { showDetails } = this.state;
    if (showDetails[mod] === value) return;
    Object.keys(showDetails).forEach((s) => { showDetails[s] = false; });
    showDetails[mod] = value;
    this.setState({ showDetails });
    const interval = mod === 'settings' || mod === 'offrz' ? 200 : 10;
    setTimeout(this.updateHeight, interval);
  }

  updateHeight() {
    const contentHeight = document.getElementById('control-center').clientHeight;
    if (contentHeight !== document.body.clientHeight) {
      document.body.style.height = `${contentHeight}px`;
    }
  }

  render() {
    const { data, dropdown, showDetails } = this.state;
    const detailView = showDetails.at || showDetails.adb;
    const safe = this.checkSafe();

    if (!data.module) {
      return <React.Fragment />;
    }

    return (
      <div
        id="control-center"
        onClick={e => this.toggleDropDown(false, null, e)}
        role="menuitem"
      >
        <div className="lock" />
        <div className={`${data.compactView ? 'compact-view' : ''} ${data.amo ? 'amo' : ''} ${data.ghostery ? 'ghostery' : ''}`}>
          {
            !data.compactView && (
              <React.Fragment>
                <Header localize={this.localize} safe={safe} />
                <div id="currentsite">
                  <h3 className="truncate">
                    {
                      data.isSpecialUrl
                        ? <span className="dark">{data.friendlyURL}</span>
                        : (
                          <React.Fragment>
                            <span className="dark">{data.domain}</span>
                            <span>{data.extraUrl}</span>
                          </React.Fragment>
                        )}
                  </h3>
                  <a
                    className="reportsite"
                    target={data.reportSiteURL}
                    role="button"
                    onClick={() => this.openUrl(data.reportSiteURL, true, 'report_url')}
                  >
                    {this.localize('control_center_report_url')}
                  </a>
                </div>
              </React.Fragment>
            )}

          <div id="settings" className={`${detailView || data.compactView ? 'hidden ' : ''}settings-section clearfix`}>
            {
              data.module.antitracking
              && (
                <Antitracking
                  data={data.module.antitracking}
                  localize={this.localize}
                  sendMessage={this.sendMessage}
                  toggleDropdown={this.toggleDropDown}
                  dropdown={dropdown.at}
                  openUrl={this.openUrl}
                  dataFunction={this.dataFunction}
                  toggleDetails={this.toggleDetails}
                  showDetails={showDetails.at}
                />
              )
            }
            {
              data.module.adblocker
              && data.module.adblocker.visible
              && (
                <AdBlock
                  data={data.module.adblocker}
                  activeURL={data.activeURL}
                  localize={this.localize}
                  sendMessage={this.sendMessage}
                  toggleDropdown={this.toggleDropDown}
                  dropdown={dropdown.adb}
                  openUrl={this.openUrl}
                  dataFunction={this.dataFunction}
                  toggleDetails={this.toggleDetails}
                  showDetails={showDetails.adb}
                />
              )
            }
            {
              data.module.autoconsent
              && data.module.autoconsent.visible
              && (
                <Autoconsent
                  data={data.module.autoconsent}
                  activeURL={data.activeURL}
                  localize={this.localize}
                  sendMessage={this.sendMessage}
                  toggleDropdown={this.toggleDropDown}
                  dropdown={dropdown.ac}
                  openUrl={this.openUrl}
                  dataFunction={this.dataFunction}
                  toggleDetails={this.toggleDetails}
                />
              )
            }
            {
              data.module['anti-phishing']
              && data.module['anti-phishing'].visible
              && (
                <Antiphishing
                  data={data.module['anti-phishing']}
                  activeURL={data.activeURL}
                  localize={this.localize}
                  sendMessage={this.sendMessage}
                  toggleDropdown={this.toggleDropDown}
                  dropdown={dropdown.ap}
                  openUrl={this.openUrl}
                />
              )
            }

            {
              data.amo
              && data.module.freshtab
              && data.module.freshtab.visible
              && (
                <div
                  className="setting"
                  id="cliqz-tab"
                  data-section="cliqz-tab"
                  data-target="cliqz-tab"
                >
                  <CliqzTab
                    data={data.module.freshtab}
                    localize={this.localize}
                    sendMessage={this.sendMessage}
                  />
                </div>
              )}

            {
              data.module['https-everywhere']
              && data.module['https-everywhere'].visible
              && (
                <Https
                  data={data.module['https-everywhere']}
                  localize={this.localize}
                  sendMessage={this.sendMessage}
                />
              )
            }
          </div>

          {showDetails.at && (
            <div className="settings-section clearfix">
              <div id="anti-tracking" className="antitracker setting active">
                <div className="frame-container anti-tracking" data-status="active">
                  <AntitrackingDetails
                    data={data.module.antitracking}
                    localize={this.localize}
                    toggleDetails={this.toggleDetails}
                    dataFunction={this.dataFunction}
                    openUrl={this.openUrl}
                  />
                </div>
              </div>
            </div>
          )}

          {showDetails.adb && (
            <div className="settings-section clearfix">
              <div id="ad-blocking" className="adblock setting active">
                <div className="frame-container anti-tracking" data-status="active">
                  <AdblockDetails
                    data={data.module.adblocker}
                    localize={this.localize}
                    toggleDetails={this.toggleDetails}
                    dataFunction={this.dataFunction}
                    openUrl={this.openUrl}
                  />
                </div>
              </div>
            </div>
          )}

          <section id="othersettings" className={detailView ? 'hidden' : ''}>
            <div className="lock" />
            {
              !data.compactView && (
                <header className="header">
                  <div className="title">
                    <span>{this.localize('control_center_othersettings')}</span>
                    <Support
                      localize={this.localize}
                      openUrl={this.openUrl}
                      feedbackURL={data.feedbackURL}
                      privacyPolicyURL={data.privacyPolicyURL}
                    />
                  </div>
                </header>
              )
            }
            <div className="accordion">
              {(
                <Settings
                  localize={this.localize}
                  openUrl={this.openUrl}
                  data={data}
                  sendMessage={this.sendMessage}
                  open={showDetails.settings}
                  toggleDetails={this.toggleDetails}
                />
              )}
              {
                data.module['offers-v2']
                && data.module['offers-v2'].visible
                && (
                <Offrz
                  localize={this.localize}
                  openUrl={this.openUrl}
                  data={data.module['offers-v2']}
                  myoffrzURL={data.myoffrzURL}
                  sendMessage={this.sendMessage}
                  open={showDetails.offrz}
                  toggleDetails={this.toggleDetails}
                />
                )}
            </div>
          </section>

          {data.compactView && (
          <header className="footer">
            <div className="title">
              {data.showPoweredBy && <span>{this.localize('control_center_footer')}</span>}
              <Support
                localize={this.localize}
                openUrl={this.openUrl}
                feedbackURL={data.feedbackURL}
                privacyPolicyURL={data.privacyPolicyURL}
              />
            </div>
          </header>
          )}
        </div>

      </div>
    );
  }
}
