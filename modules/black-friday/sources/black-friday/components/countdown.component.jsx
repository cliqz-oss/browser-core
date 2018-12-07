/* eslint-disable */

import React from 'react';
import Http from '../services/http'
import { stringify } from 'querystring';

class Time {
  calculateTime (startTime, endTime) {
    const now = new Date(startTime);
    const eventDate = new Date(endTime);
    const timeDiff = Math.abs(eventDate.getTime() - now.getTime());
    const daysDiff = Math.floor(timeDiff / (1000*3600*24));
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
    const url = 'http://10.1.18.67/api/v1/config';
    const putUrl = 'http://10.1.44.181/v2/map?q=&';
    const putData = {
      "q": "",
      "results": [
           {
               "url": "fifa-world-cup.cliqz.com",
               "snippet": {}
            }
       ]

   }

    console.log('======before request');
    this.http.get(url).then(data => {
      const ddmmyy = `${data.ts.substring(0,4)}-${data.ts.substring(4,6)}-${data.ts.substring(6,8)}`;
      this.setState({
        date: this.time.calculateTime(ddmmyy , 'November 23 2018 18:00:00')
      })

      console.log('======', data)
    })
    this.http.put(putUrl, putData).then(data => {
      console.log(data);
    })
  }

  render() {
    return (
      <div className="content count-down">
        <div>&nbsp;</div>
        <div className="count-down-box">
          <div className="number">
            <span className="count">{ this.state.date }</span>
            <span className="text">TAGE NOCH</span>
          </div>

          <h2 className="title">BLACK FRIDAY</h2>
          <span className="sub-title">Exklusive Angebote vom 23. bis 26. November</span>
        </div>
        <a className="poweredby">provided by MyOffrz</a>
      </div>
    )
  }
}

export default CountDown;
