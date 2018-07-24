import React from 'react';
import t from '../services/i18n';
import Download from './download.component';
import Http from '../services/http';
import PlaceHolder from './cardPlaceholder.component';

class GroupStage extends React.Component {
  constructor(props) {
    super(props);
    this.http = new Http();
    this.state = {
      data: {
        prev: [],
        today: [],
        next: []
      },
      currentPage: 2
    };
  }
  componentWillReceiveProps(nextProps) {
    this.setState({
      data: nextProps.data
    });
  }

  onArrowClicked(page) {
    this.setPage(page);
  }

  setPage(page) {
    if (page < 1 || page > 3) {
      return;
    }

    this.setState({
      currentPage: page
    });
  }

  convertToLocalDate(match) {
    try {
      const d = new Date(match.gameUtcTimestamp * 1000);
      const h = d.getHours();
      // we only wants 2 digits for minutes
      const m = `0${d.getMinutes()}`.slice(-2);
      return `${h}:${m}`;
    } catch (e) {
      // if something goes wrong let's just show the german time
      return match.gameTime;
    }
  }

  render() {
    return (
      <section className="cards-holder">
        <button
          className={`arrow prev ${this.state.currentPage === 1 ? 'disabled' : ''}`}
          onClick={() => this.onArrowClicked(this.state.currentPage - 1)}
        />
        <button
          className={`arrow next ${this.state.currentPage === 3 ? 'disabled' : ''}`}
          onClick={() => this.onArrowClicked(this.state.currentPage + 1)}
        />
        <h2>
          {t.title}
          <span>{t.subtitle_powered} <a href="http://www.kicker.de/" rel="noopener noreferrer " target="_blank">{t.subtitle_by}</a></span>
        </h2>
        <div>
          <div className="row">
            {/* previous game */}
            <div className={`col-4 card prev ${this.state.currentPage !== 1 ? 'hidden' : ''}`}>
              <div>
                <header>{t.yesterday}</header>
                {
                  this.state.data.prev ?
                    this.state.data.prev.map(match => (
                      <div className="game_unit" key={match.live_url}>
                        <a href={match.live_url} target="_blank">
                          <div className="row header">
                            <div className="col-10 title">
                              { this.convertToLocalDate(match) } |  { match.group }
                            </div>
                            <div className="col-2 status">
                              {match.isLive &&
                                <span>Live</span>
                              }
                            </div>
                          </div>
                          <div className="row">
                            <div className="col-10"><span><img src={match.hostLogo} alt={match.HOST.slice(0, 2).toUpperCase()} /></span>{ match.HOST }</div>
                            <div className="col-2">{ match.hostScore }</div>
                          </div>
                          <div className="row">
                            <div className="col-10"><span><img src={match.guestLogo} alt={match.GUESS.slice(0, 2).toUpperCase()} /></span>{ match.GUESS }</div>
                            <div className="col-2">{ match.guestScore }</div>
                          </div>
                        </a>
                      </div>
                    ))
                    :
                    <div className="no-data props" />
                }
                <PlaceHolder data={this.state.data.prev} />
              </div>
            </div>
            {/* Today games */}
            <div className={`col-4 card current ${this.state.currentPage !== 2 ? 'hidden' : ''}`}>
              <div>
                <header>{t.today}</header>
                {
                  this.state.data.today ?
                    this.state.data.today.map(match => (
                      <div className="game_unit" key={match.live_url}>
                        <a href={match.live_url} target="_blank">
                          <div className="row header">
                            <div className="col-10 title">
                              { this.convertToLocalDate(match) } |  { match.group }
                            </div>
                            <div className="col-2 status">
                              {match.isLive &&
                              <span>Live</span>
                              }
                            </div>
                          </div>
                          <div className="row">
                            <div className="col-10"><span><img src={match.hostLogo} alt={match.HOST.slice(0, 2).toUpperCase()} /></span>{ match.HOST }</div>
                            <div className="col-2">{ match.hostScore }</div>
                          </div>
                          <div className="row">
                            <div className="col-10"><span><img src={match.guestLogo} alt={match.GUESS.slice(0, 2).toUpperCase()} /></span>{ match.GUESS }</div>
                            <div className="col-2">{ match.guestScore }</div>
                          </div>
                        </a>
                      </div>
                    ))
                    :
                    <div className="no-data" />
                }
                <PlaceHolder data={this.state.data.today} />
              </div>
            </div>
            {/* next game */}
            <div className={`col-4 card next ${this.state.currentPage !== 3 ? 'hidden' : ''}`}>
              <div>
                <header>{t.tomorrow}</header>
                {
                  this.state.data.next ?
                    this.state.data.next.map(match => (
                      <div className="game_unit" key={match.live_url}>
                        <a href={match.live_url} target="_blank">
                          <div className="row header">
                            <div className="col-10 title">
                              { this.convertToLocalDate(match) } |  { match.group }
                            </div>
                            <div className="col-2 status">
                              {match.isLive &&
                              <span>Live</span>
                              }
                            </div>
                          </div>
                          <div className="row">
                            <div className="col-10"><span><img src={match.hostLogo} alt={match.HOST.slice(0, 2).toUpperCase()} /></span>{ match.HOST }</div>
                            <div className="col-2">{ match.hostScore }</div>
                          </div>
                          <div className="row">
                            <div className="col-10"><span><img src={match.guestLogo} alt={match.GUESS.slice(0, 2).toUpperCase()} /></span>{ match.GUESS }</div>
                            <div className="col-2">{ match.guestScore }</div>
                          </div>
                        </a>
                      </div>
                    ))
                    :
                    <div className="no-data" />
                }
                <PlaceHolder data={this.state.data.next} />
              </div>
            </div>
          </div>
        </div>


        <Download />
      </section>
    );
  }
}

export default GroupStage;
