/* eslint-disable react/jsx-no-target-blank */
import React from 'react';
import Download from './download.component';
import Http from '../services/http';
import t from '../services/i18n';

class Time {
  calculateTime(startTime, endTime) {
    const now = new Date(startTime);
    const eventDate = new Date(endTime);
    const timeDiff = Math.abs(eventDate.getTime() - now.getTime());
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  }
}

class CountDown extends React.Component {
  constructor() {
    super();
    this.http = new Http();
    this.time = new Time();
    this.state = {
      date: ''
    };
  }

  componentWillMount() {
    const url = 'https://api.cliqz.com/api/v1/config';

    this.http.get(url).then((data) => {
      const ddmmyy = `${data.ts.substring(0, 4)}-${data.ts.substring(4, 6)}-${data.ts.substring(6, 8)}`;
      this.setState({
        date: this.time.calculateTime(ddmmyy, 'June 14 2018 18:00:00')
      });
    });
  }

  render() {
    return (
      <div className="content count-down">
        <h2>{t.title}
          <span>{t.subtitle_powered} <a href="http://www.kicker.de/" target="_blank">{t.subtitle_by}</a></span>
        </h2>
        <div className="count-down-box">
          <div className="number">
            <span>{ this.state.date }</span>
            { this.state.date === 1 ? t.day : t.days } <br /> { t.remainings }
          </div>
        </div>
        <Download />
      </div>
    );
  }
}

export default CountDown;
